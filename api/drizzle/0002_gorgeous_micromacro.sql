CREATE TABLE `shipmentDetail` (
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
CREATE TABLE `shipmentHeader` (
	`id` text PRIMARY KEY NOT NULL,
	`shipmentNumber` text NOT NULL,
	`customerId` text NOT NULL,
	`r2FileKey` text,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipmentHeader_shipmentNumber_unique` ON `shipmentHeader` (`shipmentNumber`);