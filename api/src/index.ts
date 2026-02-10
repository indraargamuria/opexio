import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS middleware for frontend
app.use("/*", cors({
  origin: ["http://localhost:5173", "https://opexio-web.pages.dev"],
  credentials: true,
}));

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth(c.env).handler(c.req.raw);
});

app.get("/", (c) => {
  return c.text("Hello Hono with Better Auth!");
});

export default app;
