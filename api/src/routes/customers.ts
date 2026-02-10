import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { dbStart } from "../db";
import { customers } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", async (c) => {
    const db = dbStart(c.env.DB);
    const result = await db.select().from(customers).all();
    return c.json(result);
});

app.post("/", async (c) => {
    const db = dbStart(c.env.DB);
    const body = await c.req.json();
    const id = uuidv4();
    const now = new Date();

    const newCustomer = {
        id,
        customerId: body.customerId,
        name: body.name,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(customers).values(newCustomer).run();
    return c.json(newCustomer, 201);
});

app.put("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");
    const body = await c.req.json();
    const now = new Date();

    const result = await db
        .update(customers)
        .set({ ...body, updatedAt: now })
        .where(eq(customers.id, id))
        .returning()
        .get();

    if (!result) {
        return c.json({ error: "Customer not found" }, 404);
    }

    return c.json(result);
});

app.delete("/:id", async (c) => {
    const db = dbStart(c.env.DB);
    const id = c.req.param("id");

    const result = await db
        .delete(customers)
        .where(eq(customers.id, id))
        .returning()
        .get();

    if (!result) {
        return c.json({ error: "Customer not found" }, 404);
    }

    return c.json(result);
});

export default app;
