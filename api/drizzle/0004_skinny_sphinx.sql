PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
INSERT INTO `__new_customers`("id", "customerId", "name", "emailAddress", "createdBy", "updatedAt", "createdAt") SELECT "id", "customerId", "name", "emailAddress", "createdBy", "updatedAt", "createdAt" FROM `customers`;--> statement-breakpoint
DROP TABLE `customers`;--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customerId_unique` ON `customers` (`customerId`);--> statement-breakpoint
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
INSERT INTO `__new_shipmentHeader`("id", "shipmentNumber", "customerId", "r2FileKey", "status", "createdBy", "createdAt", "updatedAt") SELECT "id", "shipmentNumber", "customerId", "r2FileKey", "status", "createdBy", "createdAt", "updatedAt" FROM `shipmentHeader`;--> statement-breakpoint
DROP TABLE `shipmentHeader`;--> statement-breakpoint
ALTER TABLE `__new_shipmentHeader` RENAME TO `shipmentHeader`;--> statement-breakpoint
CREATE UNIQUE INDEX `shipmentHeader_shipmentNumber_unique` ON `shipmentHeader` (`shipmentNumber`);