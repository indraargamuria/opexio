import { Hono } from "hono";
import { auth } from "./auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth(c.env).handler(c.req.raw);
});

app.get("/", (c) => {
  return c.text("Hello Hono with Better Auth!");
});

export default app;
