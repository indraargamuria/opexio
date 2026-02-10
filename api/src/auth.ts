import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { dbStart } from "./db";
import { hash, compare } from "bcryptjs";

export const auth = (env: any, request?: Request) => {
    const trustedOrigins = ["http://localhost:5173", "https://opexio-web.pages.dev"];

    // Dynamically add current origin if it matches our domain patterns
    if (request) {
        const origin = request.headers.get("Origin");
        if (origin && (origin.endsWith(".opexio-web.pages.dev") || origin === "https://opexio-web.pages.dev")) {
            trustedOrigins.push(origin);
        }
    }

    return betterAuth({
        database: drizzleAdapter(dbStart(env.DB), {
            provider: "sqlite",
        }),
        emailAndPassword: {
            enabled: true,
            password: {
                hash: async (password: string) => {
                    return await hash(password, 10);
                },
                verify: async ({ hash, password }) => {
                    return await compare(password, hash);
                },
            },
        },
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
        trustedOrigins,
        advanced: {
            useSecureCookies: true, // Force secure cookies for production
            defaultCookieAttributes: {
                sameSite: "none",
                secure: true,
            },
        },
    });
};
