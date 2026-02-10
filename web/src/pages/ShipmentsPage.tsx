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
import { Trash2, Edit, Plus, FileText, Download, X } from "lucide-react";
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
    qtyDelivered?: number | null; // Add qtyDelivered
}

interface Shipment {
    id: string;
    shipmentNumber: string;
    customerId: string;
    r2FileKey: string | null;
    status: string;
    createdBy?: string | null;
    createdByName?: string | null;
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
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        shipmentNumber: "",
        customerId: "",
        r2FileKey: null,
        status: "On Going",
        createdBy: "",
    });

    const [detailItems, setDetailItems] = useState<Array<{
        itemCode: string;
        itemDescription: string;
        quantity: string;
        qtyDelivered: string; // Add qtyDelivered to state
        status: string;
    }>>([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

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
            const file = e.target.files[0];
            setSelectedFile(file);

            // Create preview URL for images and PDFs
            const fileType = file.type;
            if (fileType.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setFilePreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            } else if (fileType === 'application/pdf') {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleDetailChange = (index: number, field: string, value: string) => {
        const newDetails = [...detailItems];
        newDetails[index] = { ...newDetails[index], [field]: value };
        setDetailItems(newDetails);
    };

    const addDetailItem = () => {
        setDetailItems([...detailItems, { itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
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

        setIsCreating(true);
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

            // Add timeout wrapper (30 seconds for large file uploads)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch(`${API_URL}/api/shipments`, {
                method: "POST",
                body: formDataToSend,
                credentials: "include",
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                const result = await res.json();
                console.log("Shipment created successfully:", result);
                setIsDialogOpen(false);
                setFormData({ shipmentNumber: "", customerId: "", status: "On Going", createdBy: "", r2FileKey: null });
                setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
                setSelectedFile(null);
                setFilePreview(null);
                await fetchShipments();
            } else {
                const error = await res.json();
                console.error("Failed to create shipment:", error);
                alert(`Failed to create shipment: ${error.error || "Unknown error"}\n\nPlease refresh the page to check if the shipment was created.`);
                // Still refresh to check if data was saved
                await fetchShipments();
            }
        } catch (error) {
            console.error("Error creating shipment:", error);
            if (error instanceof Error && error.name === 'AbortError') {
                alert("Request timed out. The shipment may still have been created.\n\nPlease refresh to check.");
            } else {
                alert("Error creating shipment: " + (error instanceof Error ? error.message : "Unknown error"));
            }
            // Refresh to see if shipment was actually created
            await fetchShipments();
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async () => {
        if (!currentShipment) return;

        try {
            // Update header status
            const headerRes = await fetch(`${API_URL}/api/shipments/${currentShipment.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: formData.status,
                    details: detailItems.map(item => ({
                        itemCode: item.itemCode,
                        itemDescription: item.itemDescription || null,
                        quantity: parseInt(item.quantity),
                        status: item.status
                    }))
                }),
                credentials: "include",
            });

            if (headerRes.ok) {
                setIsEditDialogOpen(false);
                setCurrentShipment(null);
                setFormData({ shipmentNumber: "", customerId: "", status: "On Going", createdBy: "", r2FileKey: null });
                setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
                fetchShipments();
            } else {
                console.error("Failed to update shipment");
                alert("Failed to update shipment");
            }
        } catch (error) {
            console.error("Error updating shipment:", error);
            alert("Error updating shipment");
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

    const handleDownload = async (shipmentId: string, shipmentNumber: string, type: 'original' | 'stamped' = 'original') => {
        try {
            const res = await fetch(`${API_URL}/api/shipments/${shipmentId}/file?download=true&type=${type}`, {
                credentials: "include",
            });

            if (res.ok) {
                const blob = await res.blob();

                // Extract filename from Content-Disposition header
                const contentDisposition = res.headers.get('Content-Disposition');
                let filename = `${shipmentNumber}-document`;

                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1];
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Failed to download file");
            }
        } catch (error) {
            console.error("Error downloading file:", error);
            alert("Error downloading file");
        }
    };

    const openEditDialog = async (shipmentId: string) => {
        try {
            // Fetch shipment with details
            const res = await fetch(`${API_URL}/api/shipments/${shipmentId}`, {
                credentials: "include",
            });

            if (res.ok) {
                const shipment = await res.json();
                setCurrentShipment(shipment);
                setFormData({
                    shipmentNumber: shipment.shipmentNumber,
                    customerId: shipment.customerId,
                    status: shipment.status,
                    createdBy: shipment.createdBy || "",
                    r2FileKey: shipment.r2FileKey
                });

                // Load detail items for editing
                if (shipment.details && shipment.details.length > 0) {
                    setDetailItems(shipment.details.map((detail: ShipmentDetail) => ({
                        itemCode: detail.itemCode,
                        itemDescription: detail.itemDescription || "",
                        quantity: detail.quantity.toString(),
                        qtyDelivered: detail.qtyDelivered !== undefined && detail.qtyDelivered !== null ? detail.qtyDelivered.toString() : "",
                        status: detail.status,
                    })));
                } else {
                    setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
                }

                setIsEditDialogOpen(true);
            }
        } catch (error) {
            console.error("Error fetching shipment details:", error);
        }
    };

    const resetCreateDialog = () => {
        setFormData({ shipmentNumber: "", customerId: "", status: "On Going", createdBy: "", r2FileKey: null });
        setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
        setSelectedFile(null);
        setFilePreview(null);
    };

    const resetEditDialog = () => {
        setCurrentShipment(null);
        setFormData({ shipmentNumber: "", customerId: "", status: "On Going", createdBy: "", r2FileKey: null });
        setDetailItems([{ itemCode: "", itemDescription: "", quantity: "", qtyDelivered: "", status: "pending" }]);
    };

    const handleCreateDialogChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            resetCreateDialog();
        }
    };

    const handleEditDialogChange = (open: boolean) => {
        setIsEditDialogOpen(open);
        if (!open) {
            resetEditDialog();
        }
    };

    const getCustomerName = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : customerId;
    };

    const formatStatus = (status: string) => {
        if (!status) return "";
        // Handle specific cases if needed, or just capitalize
        if (status.toLowerCase() === 'on going') return 'On Going';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getStatusColor = (status: string) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'delivered' || lowerStatus === 'completed') {
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        }
        if (lowerStatus === 'on going' || lowerStatus === 'processing') {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
        if (lowerStatus === 'pending') {
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        }
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    };

    const getFileIcon = (r2FileKey: string | null) => {
        if (!r2FileKey) return null;

        const extension = r2FileKey.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return '📄';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) return '🖼️';
        if (['doc', 'docx'].includes(extension || '')) return '📝';
        if (['xls', 'xlsx'].includes(extension || '')) return '📊';
        return '📎';
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Shipments</h1>
                <Dialog open={isDialogOpen} onOpenChange={handleCreateDialogChange}>
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
                                <Input
                                    id="status"
                                    value="On Going"
                                    disabled
                                    className="col-span-3 bg-muted"
                                />
                            </div>

                            {/* File Upload Section - Separate Row */}
                            <div className="col-span-4 border-t pt-4 mt-2">
                                <Label className="text-lg font-semibold mb-3 block">Attach Document</Label>
                                {!selectedFile ? (
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                        <Input
                                            id="file"
                                            type="file"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Label htmlFor="file" className="cursor-pointer">
                                            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                                            <p className="text-xs text-muted-foreground mt-1">PDF, Images, Documents</p>
                                        </Label>
                                    </div>
                                ) : (
                                    <div className="border rounded-lg p-4 bg-muted/30">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5 text-primary" />
                                                <div>
                                                    <p className="font-medium text-sm">{selectedFile.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(selectedFile.size / 1024).toFixed(2)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={removeFile}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {filePreview && selectedFile.type.startsWith('image/') && (
                                            <div className="mt-2">
                                                <img
                                                    src={filePreview}
                                                    alt="Preview"
                                                    className="max-h-48 rounded border mx-auto"
                                                />
                                            </div>
                                        )}
                                        {filePreview && selectedFile.type === 'application/pdf' && (
                                            <div className="mt-2">
                                                <iframe
                                                    src={filePreview}
                                                    className="w-full h-48 rounded border"
                                                    title="PDF Preview"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                    <div key={index} className="border rounded-lg p-4 mb-3 relative pl-12">
                                        <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold shadow-md">
                                            {index + 1}
                                        </div>
                                        {detailItems.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 text-red-500 h-8 w-8"
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating ? "Creating..." : "Create Shipment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[15%]">Shipment #</TableHead>
                            <TableHead className="w-[30%]">Customer</TableHead>
                            <TableHead className="w-[15%]">Status</TableHead>
                            <TableHead className="w-[20%]">Created By</TableHead>
                            <TableHead className="w-[10%]">File</TableHead>
                            <TableHead className="w-[10%] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No shipments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            shipments.map((shipment) => (
                                <TableRow key={shipment.id}>
                                    <TableCell className="py-1">{shipment.shipmentNumber}</TableCell>
                                    <TableCell className="py-1">{getCustomerName(shipment.customerId)}</TableCell>
                                    <TableCell className="py-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(shipment.status)}`}>
                                            {formatStatus(shipment.status)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-1">{shipment.createdByName || shipment.createdBy || "-"}</TableCell>
                                    <TableCell className="py-1">
                                        {shipment.r2FileKey ? (
                                            <div className="flex flex-row gap-2 items-center">
                                                <button
                                                    onClick={() => handleDownload(shipment.id, shipment.shipmentNumber)}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                                    title="Download Original"
                                                >
                                                    <span className="text-lg">{getFileIcon(shipment.r2FileKey)}</span>
                                                    {/* <span className="text-xs">Original</span> */}
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(shipment.id, shipment.shipmentNumber, 'stamped')}
                                                    className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
                                                    title="Download Stamped PDF"
                                                >
                                                    <span className="text-lg">✅</span>
                                                    {/* <span className="text-xs">Stamped</span> */}
                                                </button>
                                            </div>

                                        ) : (
                                            <span className="text-muted-foreground text-sm">No file</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-1">

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(shipment.id)}
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

            <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Shipment</DialogTitle>
                        <DialogDescription>
                            Update shipment status and view attached document.
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
                                className="col-span-3 bg-muted"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-customerId" className="text-right">
                                Customer
                            </Label>
                            <Select
                                value={formData.customerId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                                disabled={formData.status === "Delivered"} // Disable if delivered
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
                            <Label htmlFor="edit-status" className="text-right">
                                Status
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                disabled={formData.status === "Delivered"} // Disable if delivered
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="On Going">On Going</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Detail Items Section */}
                        <div className="col-span-4 border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-lg font-semibold">Detail Items</Label>
                                {formData.status !== "Delivered" && ( // Hide Add button if delivered
                                    <Button type="button" size="sm" onClick={addDetailItem}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Item
                                    </Button>
                                )}
                            </div>
                            {detailItems.map((detail, index) => (
                                <div key={index} className="border rounded-lg p-4 mb-3 relative pl-12">
                                    <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold shadow-md">
                                        {index + 1}
                                    </div>
                                    {detailItems.length > 1 && formData.status !== "Delivered" && ( // Hide Remove button if delivered
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 text-red-500 h-8 w-8"
                                            onClick={() => removeDetailItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <div className="grid gap-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor={`edit-itemCode-${index}`}>Item Code</Label>
                                                <Input
                                                    id={`edit-itemCode-${index}`}
                                                    value={detail.itemCode}
                                                    onChange={(e) => handleDetailChange(index, "itemCode", e.target.value)}
                                                    placeholder="e.g., ITEM-001"
                                                    disabled={formData.status === "Delivered"}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor={`edit-quantity-${index}`}>Quantity</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id={`edit-quantity-${index}`}
                                                        type="number"
                                                        value={detail.quantity}
                                                        onChange={(e) => handleDetailChange(index, "quantity", e.target.value)}
                                                        placeholder="0"
                                                        disabled={formData.status === "Delivered"}
                                                    />
                                                    {formData.status === "Delivered" && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold whitespace-nowrap">/ Delivered:</span>
                                                            <Input
                                                                type="number"
                                                                value={detail.qtyDelivered}
                                                                disabled
                                                                className="w-20 bg-green-50 border-green-200 text-green-800"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor={`edit-itemDescription-${index}`}>Description</Label>
                                            <Input
                                                id={`edit-itemDescription-${index}`}
                                                value={detail.itemDescription}
                                                onChange={(e) => handleDetailChange(index, "itemDescription", e.target.value)}
                                                placeholder="Item description"
                                                disabled={formData.status === "Delivered"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Existing Documents Section */}
                        <div className="col-span-4 border-t pt-4 mt-2">
                            <Label className="text-lg font-semibold mb-3 block">Documents</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => currentShipment && handleDownload(currentShipment.id, currentShipment.shipmentNumber, 'original')}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Original PDF
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => currentShipment && handleDownload(currentShipment.id, currentShipment.shipmentNumber, 'stamped')}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Stamped PDF (Verified)
                                </Button>
                            </div>
                        </div>

                        {/* File Preview in Edit Dialog */}
                        {
                            currentShipment?.r2FileKey && (
                                <div className="col-span-4 border-t pt-4 mt-2">
                                    <Label className="text-sm font-semibold mb-2 block">Attached Document</Label>
                                    <div className="border rounded-lg p-4 bg-muted/30">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{getFileIcon(currentShipment.r2FileKey)}</span>
                                                <div>
                                                    <p className="font-medium text-sm">{currentShipment.r2FileKey.split('/').pop()}</p>
                                                    <p className="text-xs text-muted-foreground">Document preview below</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(currentShipment.id, currentShipment.shipmentNumber)}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                        {currentShipment.r2FileKey.toLowerCase().endsWith('.pdf') && (
                                            <div className="mt-3">
                                                <iframe
                                                    src={`${API_URL}/api/shipments/${currentShipment.id}/file#toolbar=0&navpanes=0&scrollbar=0`}
                                                    className="w-full h-96 rounded border"
                                                    title="PDF Preview"
                                                />
                                            </div>
                                        )}
                                        {['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => currentShipment.r2FileKey?.toLowerCase().endsWith(`.${ext}`)) && (
                                            <div className="mt-3">
                                                <img
                                                    src={`${API_URL}/api/shipments/${currentShipment.id}/file`}
                                                    alt="Document preview"
                                                    className="max-h-96 rounded border mx-auto"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    </div >
                    <DialogFooter>
                        {formData.status !== "Delivered" && (
                            <Button onClick={handleUpdate}>Update</Button>
                        )}
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </div >
    );
}
