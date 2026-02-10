import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { dbStart } from "../db";
import { customers, user } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", async (c) => {
    const db = dbStart(c.env.DB);
    const result = await db
        .select({
            id: customers.id,
            customerId: customers.customerId,
            name: customers.name,
            emailAddress: customers.emailAddress,
            createdBy: customers.createdBy,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
            createdByName: user.name
        })
        .from(customers)
        .leftJoin(user, eq(customers.createdBy, user.id))
        .all();
    return c.json(result);
});

app.post("/", async (c) => {
    const session = await auth(c.env, c.req.raw).api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const db = dbStart(c.env.DB);
    const body = await c.req.json();
    const id = uuidv4();
    const now = new Date();

    const newCustomer = {
        id,
        customerId: body.customerId,
        name: body.name,
        emailAddress: body.emailAddress || null,
        createdBy: session.user.id,
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

    const updateData: any = {
        name: body.name,
        emailAddress: body.emailAddress,
        updatedAt: now
    };

    const result = await db
        .update(customers)
        .set(updateData)
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
