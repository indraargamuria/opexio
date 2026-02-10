import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbStart } from "./db";

export const auth = (env: any) =>
    betterAuth({
        database: drizzleAdapter(dbStart(env.DB), {
            provider: "sqlite",
        }),
        emailAndPassword: {
            enabled: true,
        },
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins: ["http://localhost:5173", "https://*.opexio-web.pages.dev", "https://opexio-web.pages.dev"],
        advanced: {
            cookieOptions: {
                sameSite: "none",
                secure: true,
            },
        },
    });
