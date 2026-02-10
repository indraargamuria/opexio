import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { dbStart } from "../db";
import { shipmentHeader, shipmentDetail } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { createShipmentSchema } from "./shipments/validation";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET all shipments
app.get("/", async (c) => {
    const db = dbStart(c.env.DB);
    const result = await db.select().from(shipmentHeader).all();
    return c.json(result);
});

// GET single shipment with details
app.get("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    const header = await db
        .select()
        .from(shipmentHeader)
        .where(eq(shipmentHeader.id, id))
        .get();

    if (!header) {
        return c.json({ error: "Shipment not found" }, 404);
    }

    const details = await db
        .select()
        .from(shipmentDetail)
        .where(eq(shipmentDetail.shipmentHeaderId, id))
        .all();

    return c.json({ ...header, details });
});

// POST create new shipment with file upload
app.post("/", async (c) => {
    try {
        const db = dbStart(c.env.DB);
        const formData = await c.req.parseBody();

        // Extract file
        const file = formData["file"] as File;
        if (!file) {
            return c.json({ error: "File is required" }, 400);
        }

        // Parse and validate header and details JSON
        const headerData = JSON.parse(formData["header"] as string);
        const detailsData = JSON.parse(formData["details"] as string);

        const validation = createShipmentSchema.safeParse({
            header: headerData,
            details: detailsData
        });

        if (!validation.success) {
            return c.json({ error: "Validation failed", details: validation.error.issues }, 400);
        }

        const { header, details } = validation.data;
        const now = new Date();
        const headerId = uuidv4();

        // Upload file to R2
        const fileKey = `shipments/${header.shipmentNumber}/${file.name}`;
        const arrayBuffer = await file.arrayBuffer();
        await c.env.MY_BUCKET.put(fileKey, arrayBuffer, {
            httpMetadata: {
                contentType: file.type
            }
        });

        // Prepare database records
        const newHeader = {
            id: headerId,
            shipmentNumber: header.shipmentNumber,
            customerId: header.customerId,
            r2FileKey: fileKey,
            status: header.status,
            createdAt: now,
            updatedAt: now
        };

        const newDetails = details.map(detail => ({
            id: uuidv4(),
            shipmentHeaderId: headerId,
            itemCode: detail.itemCode,
            itemDescription: detail.itemDescription || null,
            quantity: detail.quantity,
            status: detail.status,
            createdAt: now,
            updatedAt: now
        }));

        // Atomic insert using batch
        await db.batch([
            db.insert(shipmentHeader).values(newHeader),
            ...newDetails.map(detail => db.insert(shipmentDetail).values(detail))
        ]);

        // Return created shipment
        return c.json({ ...newHeader, details: newDetails }, 201);
    } catch (error) {
        console.error("Error creating shipment:", error);
        return c.json({ error: "Failed to create shipment" }, 500);
    }
});

// PUT update shipment header
app.put("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();
    const now = new Date();

    const result = await db
        .update(shipmentHeader)
        .set({ ...body, updatedAt: now })
        .where(eq(shipmentHeader.id, id))
        .returning()
        .get();

    if (!result) {
        return c.json({ error: "Shipment not found" }, 404);
    }

    return c.json(result);
});

// DELETE shipment and associated file
app.delete("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    // Get shipment to retrieve R2 file key
    const existing = await db
        .select()
        .from(shipmentHeader)
        .where(eq(shipmentHeader.id, id))
        .get();

    if (!existing) {
        return c.json({ error: "Shipment not found" }, 404);
    }

    // Delete R2 file if exists
    if (existing.r2FileKey) {
        await c.env.MY_BUCKET.delete(existing.r2FileKey);
    }

    // Delete details first (FK constraint)
    await db.delete(shipmentDetail).where(eq(shipmentDetail.shipmentHeaderId, id)).run();

    // Delete header
    const result = await db
        .delete(shipmentHeader)
        .where(eq(shipmentHeader.id, id))
        .returning()
        .get();

    return c.json(result);
});

export default app;
