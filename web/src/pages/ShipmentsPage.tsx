import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Plus, FileText } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ShipmentDetail {
    id: string;
    shipmentHeaderId: string;
    itemCode: string;
    itemDescription: string | null;
    quantity: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface Shipment {
    id: string;
    shipmentNumber: string;
    customerId: string;
    r2FileKey: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    details?: ShipmentDetail[];
}

interface Customer {
    id: string;
    customerId: string;
    name: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        shipmentNumber: "",
        customerId: "",
        status: "pending",
    });

    const [detailItems, setDetailItems] = useState<Array<{
        itemCode: string;
        itemDescription: string;
        quantity: string;
        status: string;
    }>>([{ itemCode: "", itemDescription: "", quantity: "", status: "pending" }]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/shipments`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setShipments(data);
            } else {
                console.error("Failed to fetch shipments");
            }
        } catch (error) {
            console.error("Error fetching shipments:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/customers`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    useEffect(() => {
        fetchShipments();
        fetchCustomers();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDetailChange = (index: number, field: string, value: string) => {
        const newDetails = [...detailItems];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setDetailItems(newDetails);
    };

    const addDetailItem = () => {
        setDetailItems([...detailItems, { itemCode: "", itemDescription: "", quantity: "", status: "pending" }]);
    };

    const removeDetailItem = (index: number) => {
        if (detailItems.length > 1) {
            setDetailItems(detailItems.filter((_, i) => i !== index));
        }
    };

    const handleCreate = async () => {
        if (!selectedFile) {
            alert("Please select a file to upload");
            return;
        }

        try {
            const formDataToSend = new FormData();
            formDataToSend.append("file", selectedFile);
            formDataToSend.append("header", JSON.stringify(formData));

            const detailsForSubmit = detailItems.map(item => ({
                itemCode: item.itemCode,
                itemDescription: item.itemDescription || null,
                quantity: parseInt(item.quantity),
                status: item.status
            }));
            formDataToSend.append("details", JSON.stringify(detailsForSubmit));

            const res = await fetch(`${API_URL}/api/shipments`, {
                method: "POST",
                body: formDataToSend,
                credentials: "include",
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setFormData({ shipmentNumber: "", customerId: "", status: "pending" });
                setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", status: "pending" }]);
                setSelectedFile(null);
                fetchShipments();
            } else {
                const error = await res.json();
                console.error("Failed to create shipment:", error);
                alert(`Failed to create shipment: ${error.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error creating shipment:", error);
            alert("Error creating shipment");
        }
    };

    const handleUpdate = async () => {
        if (!currentShipment) return;

        try {
            const res = await fetch(`${API_URL}/api/shipments/${currentShipment.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: formData.status }),
                credentials: "include",
            });

            if (res.ok) {
                setIsEditDialogOpen(false);
                setCurrentShipment(null);
                setFormData({ shipmentNumber: "", customerId: "", status: "pending" });
                fetchShipments();
            } else {
                console.error("Failed to update shipment");
            }
        } catch (error) {
            console.error("Error updating shipment:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this shipment? This will also delete the associated file.")) return;

        try {
            const res = await fetch(`${API_URL}/api/shipments/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                fetchShipments();
            } else {
                console.error("Failed to delete shipment");
            }
        } catch (error) {
            console.error("Error deleting shipment:", error);
        }
    };

    const openEditDialog = (shipment: Shipment) => {
        setCurrentShipment(shipment);
        setFormData({
            shipmentNumber: shipment.shipmentNumber,
            customerId: shipment.customerId,
            status: shipment.status,
        });
        setIsEditDialogOpen(true);
    };

    const getCustomerName = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : customerId;
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Shipments</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Shipment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Shipment</DialogTitle>
                            <DialogDescription>
                                Create a new shipment with details and attach a file.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Header Fields */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="shipmentNumber" className="text-right">
                                    Shipment #
                                </Label>
                                <Input
                                    id="shipmentNumber"
                                    name="shipmentNumber"
                                    value={formData.shipmentNumber}
                                    onChange={handleInputChange}
                                    className="col-span-3"
                                    placeholder="e.g., SHP-001"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="customerId" className="text-right">
                                    Customer
                                </Label>
                                <Select
                                    value={formData.customerId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.name} ({customer.customerId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="file" className="text-right">
                                    File
                                </Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={handleFileChange}
                                    className="col-span-3"
                                />
                            </div>

                            {/* Detail Items */}
                            <div className="col-span-4 border-t pt-4 mt-2">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="text-lg font-semibold">Detail Items</Label>
                                    <Button type="button" size="sm" onClick={addDetailItem}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Item
                                    </Button>
                                </div>
                                {detailItems.map((detail, index) => (
                                    <div key={index} className="border rounded-lg p-4 mb-3 relative">
                                        {detailItems.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 text-red-500"
                                                onClick={() => removeDetailItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <div className="grid gap-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor={`itemCode-${index}`}>Item Code</Label>
                                                    <Input
                                                        id={`itemCode-${index}`}
                                                        value={detail.itemCode}
                                                        onChange={(e) => handleDetailChange(index, "itemCode", e.target.value)}
                                                        placeholder="e.g., ITEM-001"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                                                    <Input
                                                        id={`quantity-${index}`}
                                                        type="number"
                                                        value={detail.quantity}
                                                        onChange={(e) => handleDetailChange(index, "quantity", e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label htmlFor={`itemDescription-${index}`}>Description</Label>
                                                <Input
                                                    id={`itemDescription-${index}`}
                                                    value={detail.itemDescription}
                                                    onChange={(e) => handleDetailChange(index, "itemDescription", e.target.value)}
                                                    placeholder="Item description"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`detailStatus-${index}`}>Status</Label>
                                                <Select
                                                    value={detail.status}
                                                    onValueChange={(value) => handleDetailChange(index, "status", value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="processing">Processing</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create Shipment</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Shipment #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No shipments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            shipments.map((shipment) => (
                                <TableRow key={shipment.id}>
                                    <TableCell className="font-medium">{shipment.shipmentNumber}</TableCell>
                                    <TableCell>{getCustomerName(shipment.customerId)}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${shipment.status === 'completed' ? 'bg-green-50 text-green-700' :
                                                shipment.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-yellow-50 text-yellow-700'
                                            }`}>
                                            {shipment.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {shipment.r2FileKey ? (
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <span className="text-muted-foreground text-sm">No file</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(shipment)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDelete(shipment.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Shipment</DialogTitle>
                        <DialogDescription>
                            Update shipment status.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-shipmentNumber" className="text-right">
                                Shipment #
                            </Label>
                            <Input
                                id="edit-shipmentNumber"
                                value={formData.shipmentNumber}
                                disabled
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-status" className="text-right">
                                Status
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdate}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
