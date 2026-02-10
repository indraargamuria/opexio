import { z } from "zod";

export const createShipmentDetailSchema = z.object({
    itemCode: z.string().min(1, "Item code is required"),
    itemDescription: z.string().optional(),
    quantity: z.number().int().positive("Quantity must be positive"),
    status: z.string().min(1, "Status is required")
});

export const createShipmentHeaderSchema = z.object({
    shipmentNumber: z.string().min(1, "Shipment number is required"),
    customerId: z.string().min(1, "Customer ID is required"),
    status: z.string().min(1, "Status is required"),
    createdBy: z.string().optional()
});

export const createShipmentSchema = z.object({
    header: createShipmentHeaderSchema,
    details: z.array(createShipmentDetailSchema).min(1, "At least one detail item is required")
});
