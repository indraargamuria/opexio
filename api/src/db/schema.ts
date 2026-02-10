import { sqliteTable, text, integer, int } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id)
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const customers = sqliteTable("customers", {
    id: text("id").primaryKey(),
    customerId: text("customerId").notNull().unique(),
    name: text("name").notNull(),
    emailAddress: text("emailAddress"),
    createdBy: text("createdBy").references(() => user.id),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull()
});

export const shipmentHeader = sqliteTable("shipmentHeader", {
    id: text("id").primaryKey(),
    shipmentNumber: text("shipmentNumber").notNull().unique(),
    customerId: text("customerId").notNull().references(() => customers.id),
    r2FileKey: text("r2FileKey"),
    stampedFileKey: text("stampedFileKey"),
    status: text("status").notNull(),
    publicToken: text("publicToken").unique(),
    isLinkActive: integer("isLinkActive", { mode: "boolean" }).default(true),
    deliveryComments: text("deliveryComments"),
    createdBy: text("createdBy").references(() => user.id),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const shipmentDetail = sqliteTable("shipmentDetail", {
    id: text("id").primaryKey(),
    shipmentHeaderId: text("shipmentHeaderId").notNull().references(() => shipmentHeader.id),
    itemCode: text("itemCode").notNull(),
    itemDescription: text("itemDescription"),
    quantity: integer("quantity").notNull(),
    qtyDelivered: integer("qtyDelivered"),
    status: text("status").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});
