CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceNumber` text NOT NULL,
	`customerId` text NOT NULL,
	`shipmentId` text,
	`amount` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`documentPath` text,
	`entryType` text NOT NULL,
	`issueDate` integer NOT NULL,
	`dueDate` integer NOT NULL,
	`deletedAt` integer,
	`createdBy` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipmentId`) REFERENCES `shipmentHeader`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoiceNumber_unique` ON `invoices` (`invoiceNumber`);