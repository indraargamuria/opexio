import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";

import customers from "./routes/customers";
import publicRoutes from "./routes/public";
import shipments from "./routes/shipments";

const app = new Hono<{ Bindings: CloudflareBindings }>();

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
  return auth(c.env, c.req.raw).handler(c.req.raw);
});

app.route("/public", publicRoutes);
app.route("/api/customers", customers);
app.route("/api/shipments", shipments);

app.get("/", (c) => {
  return c.text("Hello Hono with Better Auth!");
});

export default app;
