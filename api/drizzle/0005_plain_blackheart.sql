ALTER TABLE `shipmentHeader` ADD `stampedFileKey` text;--> statement-breakpoint
ALTER TABLE `shipmentHeader` ADD `publicToken` text;--> statement-breakpoint
ALTER TABLE `shipmentHeader` ADD `isLinkActive` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `shipmentHeader` ADD `qtyDelivered` integer;--> statement-breakpoint
ALTER TABLE `shipmentHeader` ADD `deliveryComments` text;--> statement-breakpoint
CREATE UNIQUE INDEX `shipmentHeader_publicToken_unique` ON `shipmentHeader` (`publicToken`);