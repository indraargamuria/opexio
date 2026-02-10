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
    let fileKey: string | null = null;

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

        // Upload file to R2 with error handling
        console.log(`Uploading file for shipment ${header.shipmentNumber}...`);
        try {
            fileKey = `shipments/${header.shipmentNumber}/${file.name}`;
            const arrayBuffer = await file.arrayBuffer();
            await c.env.MY_BUCKET.put(fileKey, arrayBuffer, {
                httpMetadata: {
                    contentType: file.type
                }
            });
            console.log(`File uploaded successfully: ${fileKey}`);
        } catch (error) {
            console.error("R2 upload failed:", error);
            return c.json({ error: "Failed to upload file to storage" }, 500);
        }

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

        // Atomic insert using batch with error handling
        console.log(`Inserting shipment ${headerId} to database...`);
        try {
            await db.batch([
                db.insert(shipmentHeader).values(newHeader),
                ...newDetails.map(detail => db.insert(shipmentDetail).values(detail))
            ]);
            console.log(`Successfully created shipment ${headerId} with ${newDetails.length} detail(s)`);
        } catch (error) {
            console.error("Database insert failed:", error);

            // Try to clean up R2 file since database failed
            if (fileKey) {
                try {
                    console.log(`Cleaning up R2 file: ${fileKey}`);
                    await c.env.MY_BUCKET.delete(fileKey);
                    console.log("R2 file cleanup successful");
                } catch (cleanupError) {
                    console.error("Failed to cleanup R2 file:", cleanupError);
                }
            }

            return c.json({
                error: "Failed to save shipment to database",
                details: error instanceof Error ? error.message : "Unknown error"
            }, 500);
        }

        // Return created shipment
        return c.json({ ...newHeader, details: newDetails }, 201);
    } catch (error) {
        console.error("Unexpected error creating shipment:", error);
        return c.json({
            error: "Failed to create shipment",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
});

// PUT update shipment header and details
app.put("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();
    const now = new Date();

    try {
        // Update header - only update status field
        const updatedHeader = await db
            .update(shipmentHeader)
            .set({
                status: body.status,
                updatedAt: now,
            })
            .where(eq(shipmentHeader.id, id))
            .returning()
            .get();

        if (!updatedHeader) {
            return c.json({ error: "Shipment not found" }, 404);
        }

        // If details are provided, update them
        if (body.details && Array.isArray(body.details)) {
            // Delete existing details
            await db.delete(shipmentDetail).where(eq(shipmentDetail.shipmentHeaderId, id)).run();

            // Insert new details
            if (body.details.length > 0) {
                const newDetails = body.details.map((detail: any) => ({
                    id: crypto.randomUUID(),
                    shipmentHeaderId: id,
                    itemCode: detail.itemCode,
                    itemDescription: detail.itemDescription,
                    quantity: detail.quantity,
                    status: "pending", // Detail status always pending
                    createdAt: now,
                    updatedAt: now,
                }));

                await db.batch(
                    newDetails.map((detail: any) => db.insert(shipmentDetail).values(detail))
                );
            }
        }

        return c.json(updatedHeader);
    } catch (error) {
        console.error("Error updating shipment:", error);
        return c.json({ error: "Failed to update shipment" }, 500);
    }
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

// GET file download/preview
app.get("/:id/file", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const download = c.req.query("download") === "true"; // Check if download is requested

    const shipment = await db
        .select()
        .from(shipmentHeader)
        .where(eq(shipmentHeader.id, id))
        .get();

    if (!shipment) {
        return c.json({ error: "Shipment not found" }, 404);
    }

    if (!shipment.r2FileKey) {
        return c.json({ error: "No file attached" }, 404);
    }

    // Get the file from R2
    const object = await c.env.MY_BUCKET.get(shipment.r2FileKey);

    if (!object) {
        return c.json({ error: "File not found in storage" }, 404);
    }

    // Extract filename from R2 key
    const filename = shipment.r2FileKey.split('/').pop() || 'download';

    // Return the file with appropriate Content-Disposition
    return new Response(object.body, {
        headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': download
                ? `attachment; filename="${filename}"`
                : `inline; filename="${filename}"`,
        },
    });
});

export default app;
