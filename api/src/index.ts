import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS middleware for frontend
app.use("/*", cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin === "http://localhost:5173") return origin;
    // Allow any opexio-web.pages.dev subdomain
    if (origin?.endsWith(".opexio-web.pages.dev") || origin === "https://opexio-web.pages.dev") return origin;
    return "http://localhost:5173"; // fallback
  },
  credentials: true,
}));

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth(c.env).handler(c.req.raw);
});

app.get("/", (c) => {
  return c.text("Hello Hono with Better Auth!");
});

export default app;
