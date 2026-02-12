import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { dbStart } from "../db";
import { shipmentHeader, shipmentDetail, user } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { createShipmentSchema } from "./shipments/validation";
import { auth } from "../auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET all shipments
app.get("/", async (c) => {
    const db = dbStart(c.env.DB);
    const result = await db
        .select({
            id: shipmentHeader.id,
            shipmentNumber: shipmentHeader.shipmentNumber,
            customerId: shipmentHeader.customerId,
            r2FileKey: shipmentHeader.r2FileKey,
            status: shipmentHeader.status,
            createdBy: shipmentHeader.createdBy,
            createdAt: shipmentHeader.createdAt,
            updatedAt: shipmentHeader.updatedAt,
            createdByName: user.name
        })
        .from(shipmentHeader)
        .leftJoin(user, eq(shipmentHeader.createdBy, user.id))
        .all();
    return c.json(result);
});

// GET single shipment with details
app.get("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    const header = await db
        .select({
            id: shipmentHeader.id,
            shipmentNumber: shipmentHeader.shipmentNumber,
            customerId: shipmentHeader.customerId,
            r2FileKey: shipmentHeader.r2FileKey,
            status: shipmentHeader.status,
            createdBy: shipmentHeader.createdBy,
            createdAt: shipmentHeader.createdAt,
            updatedAt: shipmentHeader.updatedAt,
            createdByName: user.name
        })
        .from(shipmentHeader)
        .leftJoin(user, eq(shipmentHeader.createdBy, user.id))
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
    const session = await auth(c.env, c.req.raw).api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

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

        // Validate file type
        if (file.type !== "application/pdf") {
            return c.json({ error: "Only PDF files are allowed" }, 400);
        }

        const { header, details } = validation.data;
        const now = new Date();
        const headerId = uuidv4();
        const publicToken = uuidv4();

        // Upload file to R2 with error handling
        console.log(`Processing shipment ${header.shipmentNumber}...`);

        // 1. Prepare Original File
        const originalFileKey = `shipments/${header.shipmentNumber}/original.pdf`;
        const originalBuffer = await file.arrayBuffer();

        // 2. Generate Stamped PDF
        // Construct public URL. using origin from request or fallback
        const origin = new URL(c.req.url).origin;
        // In local dev, API is 8787, Web is 5173. 
        // Ideally we use an env var for FRONTEND_URL.
        // For now, if origin contains 8787, replace with 5173 for dev convenience.
        let frontendUrl = origin;
        if (origin.includes("localhost:8787")) {
            frontendUrl = origin.replace("8787", "5173");
        } else if (origin.includes("workers.dev")) {
            frontendUrl = "https://opexio-web.pages.dev";
        }


        const verificationUrl = `${frontendUrl}/verify/${publicToken}`;

        let stampedBuffer: Uint8Array;
        try {
            const { stampPdfWithQr } = await import("../lib/pdf");
            stampedBuffer = await stampPdfWithQr(originalBuffer, verificationUrl);
        } catch (error) {
            console.error("PDF Stamping failed:", error);
            return c.json({ error: "Failed to process PDF file" }, 500);
        }

        const stampedFileKey = `shipments/${header.shipmentNumber}/stamped.pdf`;

        try {
            // Upload Original
            await c.env.MY_BUCKET.put(originalFileKey, originalBuffer, {
                httpMetadata: { contentType: "application/pdf" }
            });

            // Upload Stamped
            await c.env.MY_BUCKET.put(stampedFileKey, stampedBuffer, {
                httpMetadata: { contentType: "application/pdf" }
            });

            console.log(`Files uploaded: ${originalFileKey}, ${stampedFileKey}`);
        } catch (error) {
            console.error("R2 upload failed:", error);
            return c.json({ error: "Failed to upload files to storage" }, 500);
        }

        // Prepare database records
        const newHeader = {
            id: headerId,
            shipmentNumber: header.shipmentNumber,
            customerId: header.customerId,
            r2FileKey: originalFileKey,
            stampedFileKey: stampedFileKey,
            publicToken: publicToken,
            isLinkActive: true,
            status: header.status,
            createdBy: session.user.id,
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
            console.log(`Successfully created shipment ${headerId}`);
        } catch (error) {
            console.error("Database insert failed:", error);

            // Try to clean up R2 files
            try {
                await c.env.MY_BUCKET.delete(originalFileKey);
                await c.env.MY_BUCKET.delete(stampedFileKey);
                console.log("R2 file cleanup successful");
            } catch (cleanupError) {
                console.error("Failed to cleanup R2 files:", cleanupError);
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
    const type = c.req.query("type"); // 'original' (default) or 'stamped'

    const shipment = await db
        .select()
        .from(shipmentHeader)
        .where(eq(shipmentHeader.id, id))
        .get();

    if (!shipment) {
        return c.json({ error: "Shipment not found" }, 404);
    }

    let fileKey = shipment.r2FileKey;
    let filenameSuffix = "-document";

    if (type === 'stamped') {
        if (!shipment.stampedFileKey) {
            return c.json({ error: "Stamped file not available" }, 404);
        }
        fileKey = shipment.stampedFileKey;
        filenameSuffix = "-document-withQR";

    } else if (!fileKey) {
        return c.json({ error: "No file attached" }, 404);
    }

    if (!fileKey) {
        return c.json({ error: "File key not found" }, 404);
    }

    // Get the file from R2
    const object = await c.env.MY_BUCKET.get(fileKey);

    if (!object) {
        return c.json({ error: "File not found in storage" }, 404);
    }

    // Read the file into buffer (ReadableStream can only be consumed once)
    const buffer = await object.arrayBuffer();

    // Extract filename from R2 key or shipment number
    let filename = fileKey.split('/').pop() || 'download';

    // If we want a cleaner filename based on shipment number
    const ext = filename.split('.').pop() || 'pdf';
    filename = `${shipment.shipmentNumber}${filenameSuffix}.${ext}`;

    // Return the file with appropriate Content-Disposition
    return new Response(buffer, {
        headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': download
                ? `attachment; filename="${filename}"`
                : `inline; filename="${filename}"`,
        },
    });
});

export default app;
