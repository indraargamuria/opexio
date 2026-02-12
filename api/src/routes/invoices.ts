import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { dbStart } from "../db";
import { invoices, customers, shipmentHeader, user } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET all invoices (excluding soft-deleted)
app.get("/", async (c) => {
    const db = dbStart(c.env.DB);
    const status = c.req.query("status");
    const customerId = c.req.query("customerId");
    const shipmentId = c.req.query("shipmentId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const conditions = [isNull(invoices.deletedAt)];

    if (status) {
        conditions.push(eq(invoices.status, status));
    }
    if (customerId) {
        conditions.push(eq(invoices.customerId, customerId));
    }
    if (shipmentId) {
        conditions.push(eq(invoices.shipmentId, shipmentId));
    }

    let query = db
        .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerId: invoices.customerId,
            customerName: customers.name,
            shipmentId: invoices.shipmentId,
            shipmentNumber: shipmentHeader.shipmentNumber,
            amount: invoices.amount,
            status: invoices.status,
            documentPath: invoices.documentPath,
            entryType: invoices.entryType,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            createdBy: invoices.createdBy,
            createdByName: user.name,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .leftJoin(shipmentHeader, eq(invoices.shipmentId, shipmentHeader.id))
        .leftJoin(user, eq(invoices.createdBy, user.id));

    // Apply conditions
    if (conditions.length > 0) {
        query = query.where(and(...conditions));
    }

    // Apply date filters
    if (startDate) {
        const start = new Date(startDate);
        query = query.where(and(...conditions, eq(invoices.issueDate, start) as any));
    }
    if (endDate) {
        const end = new Date(endDate);
        query = query.where(and(...conditions, eq(invoices.dueDate, end) as any));
    }

    const result = await query.all();
    return c.json(result);
});

// GET single invoice
app.get("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    const result = await db
        .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerId: invoices.customerId,
            customerName: customers.name,
            shipmentId: invoices.shipmentId,
            shipmentNumber: shipmentHeader.shipmentNumber,
            amount: invoices.amount,
            status: invoices.status,
            documentPath: invoices.documentPath,
            entryType: invoices.entryType,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            createdBy: invoices.createdBy,
            createdByName: user.name,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .leftJoin(shipmentHeader, eq(invoices.shipmentId, shipmentHeader.id))
        .leftJoin(user, eq(invoices.createdBy, user.id))
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .get();

    if (!result) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    return c.json(result);
});

// POST create new invoice
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

        // Check if multipart form data
        const contentType = c.req.header("content-type") || "";

        let headerData;
        if (contentType.includes("multipart/form-data")) {
            const formData = await c.req.parseBody();

            // Handle file upload if present
            const file = formData["file"] as File;
            if (file) {
                // Validate file type
                const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
                if (!allowedTypes.includes(file.type)) {
                    return c.json({ error: "Invalid file type. Only PDF, PNG, and JPG files are allowed." }, 400);
                }

                // Validate file size (5MB max)
                const maxSize = 5 * 1024 * 1024;
                if (file.size > maxSize) {
                    return c.json({ error: "File size exceeds 5MB limit." }, 400);
                }

                const buffer = await file.arrayBuffer();
                const fileId = uuidv4();
                const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
                fileKey = `invoices/${fileId}.${ext}`;

                await c.env.MY_BUCKET.put(fileKey, buffer, {
                    httpMetadata: { contentType: file.type }
                });
            }

            // Parse other fields
            headerData = {
                invoiceNumber: formData["invoiceNumber"],
                customerId: formData["customerId"],
                shipmentId: formData["shipmentId"] || null,
                amount: formData["amount"],
                status: formData["status"] || "Draft",
                entryType: formData["entryType"],
                issueDate: new Date(formData["issueDate"] as string),
                dueDate: new Date(formData["dueDate"] as string),
            };
        } else {
            // JSON data without file
            const body = await c.req.json();
            headerData = body;
        }

        // Validate required fields
        if (!headerData.invoiceNumber || !headerData.customerId || !headerData.amount || !headerData.entryType || !headerData.issueDate || !headerData.dueDate) {
            return c.json({ error: "Missing required fields" }, 400);
        }

        // Check if invoice number already exists
        const existing = await db
            .select()
            .from(invoices)
            .where(eq(invoices.invoiceNumber, headerData.invoiceNumber))
            .get();

        if (existing) {
            return c.json({ error: "Invoice number already exists" }, 400);
        }

        // Validate customer exists
        const customer = await db
            .select()
            .from(customers)
            .where(eq(customers.id, headerData.customerId))
            .get();

        if (!customer) {
            return c.json({ error: "Customer not found" }, 404);
        }

        // Validate shipment exists if provided
        if (headerData.shipmentId) {
            const shipment = await db
                .select()
                .from(shipmentHeader)
                .where(eq(shipmentHeader.id, headerData.shipmentId))
                .get();

            if (!shipment) {
                return c.json({ error: "Shipment not found" }, 404);
            }
        }

        const now = new Date();
        const newInvoice = {
            id: uuidv4(),
            invoiceNumber: headerData.invoiceNumber,
            customerId: headerData.customerId,
            shipmentId: headerData.shipmentId,
            amount: headerData.amount,
            status: headerData.status || "Draft",
            documentPath: fileKey,
            entryType: headerData.entryType,
            issueDate: headerData.issueDate,
            dueDate: headerData.dueDate,
            createdBy: session.user.id,
            createdAt: now,
            updatedAt: now,
        };

        await db.insert(invoices).values(newInvoice).run();
        return c.json(newInvoice, 201);
    } catch (error) {
        console.error("Error creating invoice:", error);

        // Clean up R2 file if exists
        if (fileKey) {
            try {
                await c.env.MY_BUCKET.delete(fileKey);
            } catch (cleanupError) {
                console.error("Failed to cleanup R2 file:", cleanupError);
            }
        }

        return c.json({
            error: "Failed to create invoice",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
});

// PUT update invoice
app.put("/:id", async (c) => {
    const session = await auth(c.env, c.req.raw).api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();
    const now = new Date();

    // Get existing invoice
    const existing = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .get();

    if (!existing) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    // Business rule: If System_Generated, invoice_number and amount are locked
    if (existing.entryType === "System_Generated") {
        if (body.invoiceNumber && body.invoiceNumber !== existing.invoiceNumber) {
            return c.json({ error: "Cannot modify invoice number for system-generated invoices" }, 400);
        }
        if (body.amount && body.amount !== existing.amount) {
            return c.json({ error: "Cannot modify amount for system-generated invoices" }, 400);
        }
    }

    const updateData: any = {
        updatedAt: now,
    };

    // Update status
    if (body.status) {
        const validStatuses = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];
        if (!validStatuses.includes(body.status)) {
            return c.json({ error: "Invalid status value" }, 400);
        }
        updateData.status = body.status;
    }

    // Update document path (new file upload)
    if (body.documentPath !== undefined) {
        updateData.documentPath = body.documentPath;
    }

    const result = await db
        .update(invoices)
        .set(updateData)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .returning()
        .get();

    if (!result) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    return c.json(result);
});

// DELETE (soft delete) invoice
app.delete("/:id", async (c) => {
    const session = await auth(c.env, c.req.raw).api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    // Get existing invoice
    const existing = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .get();

    if (!existing) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    // Soft delete by setting deletedAt
    const result = await db
        .update(invoices)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .returning()
        .get();

    if (!result) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    return c.json({ message: "Invoice archived successfully", invoice: result });
});

// GET file download/preview
app.get("/:id/file", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const download = c.req.query("download") === "true";

    const invoice = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), isNull(invoices.deletedAt)))
        .get();

    if (!invoice) {
        return c.json({ error: "Invoice not found" }, 404);
    }

    if (!invoice.documentPath) {
        return c.json({ error: "No document attached" }, 404);
    }

    // Get the file from R2
    const object = await c.env.MY_BUCKET.get(invoice.documentPath);

    if (!object) {
        return c.json({ error: "File not found in storage" }, 404);
    }

    // Read the file into buffer (ReadableStream can only be consumed once)
    const buffer = await object.arrayBuffer();

    // Extract filename from R2 key
    const filename = invoice.documentPath.split('/').pop() || 'download';

    // Return the file with appropriate Content-Disposition
    return new Response(buffer, {
        headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': download
                ? `attachment; filename="${invoice.invoiceNumber}-${filename}"`
                : `inline; filename="${invoice.invoiceNumber}-${filename}"`,
        },
    });
});

export default app;
