import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { dbStart } from "../db";
import { shipmentHeader, shipmentDetail, customers } from "../db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET public shipment data by token
app.get("/shipments/:token", async (c) => {
    const db = dbStart(c.env.DB);
    const token = c.req.param("token");

    const header = await db
        .select({
            id: shipmentHeader.id,
            shipmentNumber: shipmentHeader.shipmentNumber,
            status: shipmentHeader.status,
            deliveryComments: shipmentHeader.deliveryComments,
            createdAt: shipmentHeader.createdAt,
            customerName: customers.name,
            isLinkActive: shipmentHeader.isLinkActive
        })
        .from(shipmentHeader)
        .leftJoin(customers, eq(shipmentHeader.customerId, customers.id))
        .where(eq(shipmentHeader.publicToken, token))
        .get();

    if (!header) {
        return c.json({ error: "Invalid shipment token" }, 404);
    }

    if (!header.isLinkActive) {
        return c.json({ error: "This link is no longer active" }, 410);
    }

    if (header.status === "Delivered") {
        return c.json({
            shipmentNumber: header.shipmentNumber,
            status: "Delivered",
            isProcessed: true
        });
    }

    const details = await db
        .select({
            id: shipmentDetail.id,
            itemCode: shipmentDetail.itemCode,
            itemDescription: shipmentDetail.itemDescription,
            quantity: shipmentDetail.quantity,
            qtyDelivered: shipmentDetail.qtyDelivered,
            status: shipmentDetail.status
        })
        .from(shipmentDetail)
        .where(eq(shipmentDetail.shipmentHeaderId, header.id))
        .all();

    return c.json({ ...header, details });
});

// POST confirm shipment delivery
app.post("/shipments/:token/confirm", async (c) => {
    const db = dbStart(c.env.DB);
    const token = c.req.param("token");

    const header = await db
        .select()
        .from(shipmentHeader)
        .where(eq(shipmentHeader.publicToken, token))
        .get();

    if (!header) {
        return c.json({ error: "Invalid shipment token" }, 404);
    }

    if (!header.isLinkActive) {
        return c.json({ error: "This link is no longer active" }, 410);
    }

    const body = await c.req.json();
    const { deliveryComments, details } = body;

    if (!Array.isArray(details)) {
        return c.json({ error: "Invalid details format" }, 400);
    }

    const now = new Date();

    try {
        // Update header
        await db.update(shipmentHeader)
            .set({
                deliveryComments: deliveryComments,
                status: "Delivered",
                updatedAt: now,
                // Optional: Deactivate link after successful submission?
                // isLinkActive: false 
            })
            .where(eq(shipmentHeader.id, header.id))
            .run();

        // Update details using batch if possible, or sequential
        // Drizzle sqlite batch might not support update where clause inside batch easily without prepared statements, 
        // using sequential for simplicity now given low volume.
        for (const detail of details) {
            if (detail.id && detail.qtyDelivered !== undefined) {
                await db.update(shipmentDetail)
                    .set({
                        qtyDelivered: detail.qtyDelivered,
                        updatedAt: now
                    })
                    .where(eq(shipmentDetail.id, detail.id))
                    .run();
            }
        }

        return c.json({ success: true });
    } catch (error) {
        console.error("Error confirming shipment:", error);
        return c.json({ error: "Failed to confirm shipment" }, 500);
    }
});

export default app;
