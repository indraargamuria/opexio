CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`customerId` text NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customerId_unique` ON `customers` (`customerId`);