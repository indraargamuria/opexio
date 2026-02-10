import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Truck, AlertTriangle, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface ShipmentDetail {
    id: string;
    itemCode: string;
    itemDescription: string | null;
    quantity: number;
    qtyDelivered: number | null;
    status: string;
}

interface ShipmentHeader {
    id?: string; // Optional because restricted response won't have it
    shipmentNumber: string;
    status: string;
    deliveryComments?: string | null;
    createdAt?: string;
    customerName?: string | null;
    isLinkActive?: boolean;
    isProcessed?: boolean; // New flag from API
    details?: ShipmentDetail[];
}

export default function VerifyShipmentPage() {
    const { token } = useParams<{ token: string }>();
    const [shipment, setShipment] = useState<ShipmentHeader | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [deliveryComments, setDeliveryComments] = useState("");
    const [deliveredQuantities, setDeliveredQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchShipment = async () => {
            try {
                const res = await fetch(`${API_URL}/public/shipments/${token}`);
                if (res.ok) {
                    const data = await res.json();
                    setShipment(data);
                    setDeliveryComments(data.deliveryComments || "");

                    // Initialize delivered quantities with ordered quantities or existing delivered quantities
                    const qtyMap: Record<string, number> = {};
                    data.details.forEach((detail: ShipmentDetail) => {
                        qtyMap[detail.id] = detail.qtyDelivered !== null ? detail.qtyDelivered : detail.quantity;
                    });
                    setDeliveredQuantities(qtyMap);
                } else {
                    const err = await res.json();
                    setError(err.error || "Failed to load shipment");
                }
            } catch (err) {
                console.error("Error fetching shipment", err);
                setError("Network error. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchShipment();
        }
    }, [token]);

    const handleQtyChange = (id: string, value: string) => {
        const qty = parseInt(value);
        if (!isNaN(qty)) {
            setDeliveredQuantities(prev => ({ ...prev, [id]: qty }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const detailsToSubmit = Object.entries(deliveredQuantities).map(([id, qty]) => ({
                id,
                qtyDelivered: qty
            }));

            const res = await fetch(`${API_URL}/public/shipments/${token}/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    deliveryComments,
                    details: detailsToSubmit
                })
            });

            if (res.ok) {
                setSuccess(true);
                setShipment(prev => prev ? { ...prev, status: "Delivered" } : null);
            } else {
                const err = await res.json();
                alert(`Failed to confirm delivery: ${err.error}`);
            }
        } catch (err) {
            console.error("Error submitting delivery", err);
            alert("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-gray-500">Loading shipment details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Error</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Delivery Confirmed</h1>
                    <p className="text-gray-600 mb-6">
                        Thank you! The delivery confirmation for shipment <span className="font-semibold">{shipment?.shipmentNumber}</span> has been submitted successfully.
                    </p>
                </div>
            </div>
        );
    }

    // Handle already processed/delivered state
    if (shipment && (shipment.isProcessed || shipment.status === 'Delivered')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-blue-600" />
                    </div>
                    <h1 className="text-xl font-bold mb-2">Already Processed</h1>
                    <p className="text-gray-600 mb-6">
                        Shipment <span className="font-semibold">{shipment.shipmentNumber}</span> has already been delivered and processed.
                    </p>
                    <p className="text-sm text-gray-500">
                        No further action is required.
                    </p>
                </div>
            </div>
        );
    }

    if (!shipment) return null;
    if (!shipment.details) return null; // Should not happen if not processed

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
                    <div className="p-6 bg-white border-b">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Truck className="h-6 w-6 text-primary" />
                                <h1 className="text-2xl font-bold">Verify Shipment</h1>
                            </div>
                            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {shipment.status}
                            </div>
                        </div>
                        <p className="text-gray-500">
                            Please review the items below and confirm the quantities delivered.
                        </p>
                    </div>

                    <div className="p-6 bg-gray-50/50 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 text-uppercase tracking-wider">Shipment #</h3>
                                <p className="mt-1 text-lg font-semibold">{shipment.shipmentNumber}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 text-uppercase tracking-wider">Customer</h3>
                                <p className="mt-1 text-lg font-semibold">{shipment.customerName || "N/A"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 text-uppercase tracking-wider">Date</h3>
                                <p className="mt-1 text-lg font-semibold">{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <h2 className="text-lg font-semibold mb-4">Shipment Items</h2>
                        <div className="space-y-4 mb-8">
                            {shipment.details.map((item) => (
                                <div key={item.id} className="border rounded-lg p-4 bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package className="h-4 w-4 text-gray-400" />
                                            <span className="font-semibold">{item.itemCode}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 pl-6">{item.itemDescription || "No description"}</p>
                                    </div>

                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                        <div className="text-center">
                                            <span className="text-xs text-gray-500 block mb-1">Sent</span>
                                            <span className="font-medium text-lg">{item.quantity}</span>
                                        </div>

                                        <div className="flex-1 md:w-32">
                                            <Label htmlFor={`qty-${item.id}`} className="text-xs text-gray-500 block mb-1">Delivered</Label>
                                            <Input
                                                id={`qty-${item.id}`}
                                                type="number"
                                                min="0"
                                                value={deliveredQuantities[item.id] || 0}
                                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                className="w-full text-center font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-8">
                            <Label htmlFor="comments" className="text-lg font-semibold mb-2 block">Delivery Comments</Label>
                            <Textarea
                                id="comments"
                                value={deliveryComments}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeliveryComments(e.target.value)}
                                placeholder="Add any notes about the delivery here (e.g. specialized instructions, condition of goods)..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <Button type="submit" className="w-full md:w-auto md:min-w-[200px]" size="lg" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Confirm Delivery"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
