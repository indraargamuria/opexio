-- Manually rewritten to be FK-safe on D1 (Recursive dependencies)

-- 1. Unlink shipmentDetail (referenced by shipmentHeader)
CREATE TABLE `temp_shipmentDetail` (
	`id` text PRIMARY KEY NOT NULL,
	`shipmentHeaderId` text NOT NULL,
	`itemCode` text NOT NULL,
	`itemDescription` text,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `temp_shipmentDetail` SELECT id, shipmentHeaderId, itemCode, itemDescription, quantity, status, createdAt, updatedAt FROM `shipmentDetail`;
--> statement-breakpoint
DROP TABLE `shipmentDetail`;
--> statement-breakpoint

-- 2. Unlink shipmentHeader (referenced by customers)
CREATE TABLE `temp_shipmentHeader` (
	`id` text PRIMARY KEY NOT NULL,
	`shipmentNumber` text NOT NULL,
	`customerId` text NOT NULL,
	`r2FileKey` text,
	`status` text NOT NULL,
	`createdBy` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `temp_shipmentHeader` SELECT id, shipmentNumber, customerId, r2FileKey, status, createdBy, createdAt, updatedAt FROM `shipmentHeader`;
--> statement-breakpoint
DROP TABLE `shipmentHeader`;
--> statement-breakpoint

-- 3. Update Customers table (now safe)
CREATE TABLE `__new_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`customerId` text NOT NULL,
	`name` text NOT NULL,
	`emailAddress` text,
	`createdBy` text,
	`updatedAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_customers` SELECT id, customerId, name, emailAddress, createdBy, updatedAt, createdAt FROM `customers`;
--> statement-breakpoint
DROP TABLE `customers`;
--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customerId_unique` ON `customers` (`customerId`);
--> statement-breakpoint

-- 4. Restore shipmentHeader with FKs
CREATE TABLE `__new_shipmentHeader` (
	`id` text PRIMARY KEY NOT NULL,
	`shipmentNumber` text NOT NULL,
	`customerId` text NOT NULL,
	`r2FileKey` text,
	`status` text NOT NULL,
	`createdBy` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_shipmentHeader` SELECT id, shipmentNumber, customerId, r2FileKey, status, createdBy, createdAt, updatedAt FROM `temp_shipmentHeader`;
--> statement-breakpoint
DROP TABLE `temp_shipmentHeader`;
--> statement-breakpoint
ALTER TABLE `__new_shipmentHeader` RENAME TO `shipmentHeader`;
--> statement-breakpoint
CREATE UNIQUE INDEX `shipmentHeader_shipmentNumber_unique` ON `shipmentHeader` (`shipmentNumber`);
--> statement-breakpoint

-- 5. Restore shipmentDetail with FKs
CREATE TABLE `__new_shipmentDetail` (
	`id` text PRIMARY KEY NOT NULL,
	`shipmentHeaderId` text NOT NULL,
	`itemCode` text NOT NULL,
	`itemDescription` text,
	`quantity` integer NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`shipmentHeaderId`) REFERENCES `shipmentHeader`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_shipmentDetail` SELECT id, shipmentHeaderId, itemCode, itemDescription, quantity, status, createdAt, updatedAt FROM `temp_shipmentDetail`;
--> statement-breakpoint
DROP TABLE `temp_shipmentDetail`;
--> statement-breakpoint
ALTER TABLE `__new_shipmentDetail` RENAME TO `shipmentDetail`;