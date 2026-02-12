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
import { Trash2, Edit, Plus, FileText, Download, X, Filter } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    shipmentId: string | null;
    shipmentNumber: string | null;
    amount: string;
    status: string;
    documentPath: string | null;
    entryType: string;
    issueDate: string;
    dueDate: string;
    createdBy?: string | null;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
}

interface Customer {
    id: string;
    customerId: string;
    name: string;
}

interface Shipment {
    id: string;
    shipmentNumber: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
type EntryType = "Manual" | "System_Generated";

const STATUS_OPTIONS: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];
const ENTRY_TYPE_OPTIONS: EntryType[] = ["Manual", "System_Generated"];

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

    // Get default dates
    const today = new Date();
    const dueDateDefault = new Date();
    dueDateDefault.setDate(today.getDate() + 30);
    const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

    // Form state
    const [formData, setFormData] = useState({
        invoiceNumber: "",
        customerId: "",
        shipmentId: "",
        amount: "",
        status: "Draft",
        entryType: "Manual",
        issueDate: formatDateForInput(today),
        dueDate: formatDateForInput(dueDateDefault),
    });

    // Filter state
    const [filters, setFilters] = useState({
        status: "",
        customerId: "",
        shipmentId: "",
        startDate: "",
        endDate: "",
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchInvoices = async (appliedFilters = filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (appliedFilters.status) params.append("status", appliedFilters.status);
            if (appliedFilters.customerId) params.append("customerId", appliedFilters.customerId);
            if (appliedFilters.shipmentId) params.append("shipmentId", appliedFilters.shipmentId);
            if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate);
            if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate);

            const url = `${API_URL}/api/invoices${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await fetch(url, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            } else {
                console.error("Failed to fetch invoices");
            }
        } catch (error) {
            console.error("Error fetching invoices:", error);
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

    const fetchShipments = async () => {
        try {
            const res = await fetch(`${API_URL}/api/shipments`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setShipments(data);
            }
        } catch (error) {
            console.error("Error fetching shipments:", error);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchCustomers();
        fetchShipments();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
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
                reader.onload = (event) => {
                    setFilePreview(event.target?.result as string || null);
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

    const handleCreate = async () => {
        if (!selectedFile) {
            alert("Please select a file to upload");
            return;
        }

        setIsSubmitting(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append("file", selectedFile);
            formDataToSend.append("invoiceNumber", formData.invoiceNumber);
            formDataToSend.append("customerId", formData.customerId);
            if (formData.shipmentId) {
                formDataToSend.append("shipmentId", formData.shipmentId);
            }
            formDataToSend.append("amount", formData.amount);
            formDataToSend.append("status", formData.status);
            formDataToSend.append("entryType", formData.entryType);
            formDataToSend.append("issueDate", formData.issueDate);
            formDataToSend.append("dueDate", formData.dueDate);

            const res = await fetch(`${API_URL}/api/invoices`, {
                method: "POST",
                body: formDataToSend,
                credentials: "include",
            });

            if (res.ok) {
                setIsDialogOpen(false);
                resetCreateDialog();
                fetchInvoices();
            } else {
                const error = await res.json();
                alert(`Failed to create invoice: ${error.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error creating invoice:", error);
            alert("Error creating invoice: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!currentInvoice) return;

        try {
            const res = await fetch(`${API_URL}/api/invoices/${currentInvoice.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: formData.status,
                    documentPath: formData.invoiceNumber, // Placeholder for document path
                }),
                credentials: "include",
            });

            if (res.ok) {
                setIsEditDialogOpen(false);
                setCurrentInvoice(null);
                resetEditDialog();
                fetchInvoices();
            } else {
                const error = await res.json();
                alert(`Failed to update invoice: ${error.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error updating invoice:", error);
            alert("Error updating invoice");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to archive this invoice? This will maintain financial history but hide the record.")) return;

        try {
            const res = await fetch(`${API_URL}/api/invoices/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                fetchInvoices();
            } else {
                console.error("Failed to archive invoice");
            }
        } catch (error) {
            console.error("Error archiving invoice:", error);
        }
    };

    const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/file?download=true`, {
                credentials: "include",
            });

            if (res.ok) {
                const blob = await res.blob();
                // Use format: INV_invoicenumber
                const filename = `INV_${invoiceNumber}.pdf`;

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

    const openEditDialog = async (invoiceId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
                credentials: "include",
            });

            if (res.ok) {
                const invoice = await res.json();
                setCurrentInvoice(invoice);
                setFormData({
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    shipmentId: invoice.shipmentId || "",
                    amount: invoice.amount,
                    status: invoice.status,
                    entryType: invoice.entryType,
                    issueDate: new Date(invoice.issueDate).toISOString().split('T')[0],
                    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
                });
                setIsEditDialogOpen(true);
            }
        } catch (error) {
            console.error("Error fetching invoice details:", error);
        }
    };

    const resetCreateDialog = () => {
        const today = new Date();
        const dueDateDefault = new Date();
        dueDateDefault.setDate(today.getDate() + 30);
        const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

        setFormData({
            invoiceNumber: "",
            customerId: "",
            shipmentId: "",
            amount: "",
            status: "Draft",
            entryType: "Manual",
            issueDate: formatDateForInput(today),
            dueDate: formatDateForInput(dueDateDefault),
        });
        setSelectedFile(null);
        setFilePreview(null);
    };

    const resetEditDialog = () => {
        setCurrentInvoice(null);
        setFormData({
            invoiceNumber: "",
            customerId: "",
            shipmentId: "",
            amount: "",
            status: "Draft",
            entryType: "Manual",
            issueDate: "",
            dueDate: "",
        });
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

    const handleFilterChange = (name: string, value: string) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        fetchInvoices(filters);
        setIsFilterDialogOpen(false);
    };

    const clearFilters = () => {
        const clearedFilters = {
            status: "",
            customerId: "",
            shipmentId: "",
            startDate: "",
            endDate: "",
        };
        setFilters(clearedFilters);
        fetchInvoices(clearedFilters);
        setIsFilterDialogOpen(false);
    };

    const getStatusColor = (status: string) => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'paid') {
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        }
        if (lowerStatus === 'overdue') {
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        }
        if (lowerStatus === 'sent') {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
        if (lowerStatus === 'cancelled') {
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'; // Draft
    };

    const getFileIcon = (documentPath: string | null) => {
        if (!documentPath) return '';
        const extension = documentPath.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') return '📄';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) return '🖼️';
        if (['doc', 'docx'].includes(extension || '')) return '📝';
        return '📎';
    };

    const getCustomerName = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : customerId;
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsFilterDialogOpen(true)}>
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={handleCreateDialogChange}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add Invoice</DialogTitle>
                                <DialogDescription>
                                    Create a new invoice and attach a document.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="invoiceNumber" className="text-right">
                                        Invoice #
                                    </Label>
                                    <Input
                                        id="invoiceNumber"
                                        name="invoiceNumber"
                                        value={formData.invoiceNumber}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        placeholder="e.g., INV-001"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="customerId" className="text-right">
                                        Customer *
                                    </Label>
                                    <Select
                                        value={formData.customerId}
                                        onValueChange={(value) => handleSelectChange("customerId", value)}
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
                                    <Label htmlFor="shipmentId" className="text-right">
                                        Shipment
                                    </Label>
                                    <Select
                                        value={formData.shipmentId || "none"}
                                        onValueChange={(value) => handleSelectChange("shipmentId", value === "none" ? "" : value)}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select shipment (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Shipment Linked</SelectItem>
                                            {shipments.map((shipment) => (
                                                <SelectItem key={shipment.id} value={shipment.id}>
                                                    {shipment.shipmentNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">
                                        Amount *
                                    </Label>
                                    <Input
                                        id="amount"
                                        name="amount"
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right">
                                        Status
                                    </Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => handleSelectChange("status", value)}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="entryType" className="text-right">
                                        Entry Type *
                                    </Label>
                                    <Select
                                        value={formData.entryType}
                                        onValueChange={(value) => handleSelectChange("entryType", value)}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ENTRY_TYPE_OPTIONS.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type.replace("_", " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="issueDate" className="text-right">
                                        Issue Date *
                                    </Label>
                                    <Input
                                        id="issueDate"
                                        name="issueDate"
                                        type="date"
                                        value={formData.issueDate}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="dueDate" className="text-right">
                                        Due Date *
                                    </Label>
                                    <Input
                                        id="dueDate"
                                        name="dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={handleInputChange}
                                        className="col-span-3"
                                    />
                                </div>

                                {/* File Upload Section */}
                                <div className="col-span-4 border-t pt-4 mt-2">
                                    <Label className="text-lg font-semibold mb-3 block">Attach Document *</Label>
                                    {!selectedFile ? (
                                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                            <Input
                                                id="file"
                                                type="file"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                            />
                                            <Label htmlFor="file" className="cursor-pointer">
                                                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                                                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG (Max 5MB)</p>
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
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate} disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Invoice"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Shipment</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Document</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center h-24">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center h-24">
                                    No invoices found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="py-1">{invoice.invoiceNumber}</TableCell>
                                    <TableCell className="py-1">{invoice.customerName}</TableCell>
                                    <TableCell className="py-1">{invoice.shipmentNumber || "N/A"}</TableCell>
                                    <TableCell className="py-1">${parseFloat(invoice.amount).toFixed(2)}</TableCell>
                                    <TableCell className="py-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-1">{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="py-1">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="py-1">
                                        {invoice.documentPath ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                                            >
                                                <span className="text-lg">{getFileIcon(invoice.documentPath)}</span>
                                            </Button>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">No file</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right py-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(invoice.id)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDelete(invoice.id)}
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

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Invoice</DialogTitle>
                        <DialogDescription>
                            Update invoice status and view details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-invoiceNumber" className="text-right">
                                Invoice #
                            </Label>
                            <Input
                                id="edit-invoiceNumber"
                                value={formData.invoiceNumber}
                                disabled={currentInvoice?.entryType === "System_Generated"}
                                className="col-span-3 bg-muted"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-customerId" className="text-right">
                                Customer
                            </Label>
                            <Input
                                id="edit-customerId"
                                value={formData.customerId}
                                disabled
                                className="col-span-3 bg-muted"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-amount" className="text-right">
                                Amount
                            </Label>
                            <Input
                                id="edit-amount"
                                value={formData.amount}
                                disabled={currentInvoice?.entryType === "System_Generated"}
                                className="col-span-3 bg-muted"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-status" className="text-right">
                                Status
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => handleSelectChange("status", value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-entryType" className="text-right">
                                Entry Type
                            </Label>
                            <Input
                                id="edit-entryType"
                                value={formData.entryType}
                                disabled
                                className="col-span-3 bg-muted"
                            />
                        </div>
                        {currentInvoice?.documentPath && (
                            <div className="col-span-4 border-t pt-4 mt-2">
                                <Label className="text-sm font-semibold mb-2 block">Attached Document</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(currentInvoice.id, currentInvoice.invoiceNumber)}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Document
                                </Button>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdate}>Update</Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filter Dialog */}
            <Dialog open={isFilterDialogOpen} onOpenChange={(open) => { if (!open) setIsFilterDialogOpen(false); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filter Invoices</DialogTitle>
                        <DialogDescription>
                            Apply filters to narrow down the invoice list.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="filter-status" className="text-right">
                                Status
                            </Label>
                            <Select
                                value={filters.status || "all"}
                                onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {STATUS_OPTIONS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="filter-customerId" className="text-right">
                                Customer
                            </Label>
                            <Select
                                value={filters.customerId || "all"}
                                onValueChange={(value) => handleFilterChange("customerId", value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="All customers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All customers</SelectItem>
                                    {customers.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="filter-shipmentId" className="text-right">
                                Shipment
                            </Label>
                            <Select
                                value={filters.shipmentId || "all"}
                                onValueChange={(value) => handleFilterChange("shipmentId", value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="All shipments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All shipments</SelectItem>
                                    {shipments.map((shipment) => (
                                        <SelectItem key={shipment.id} value={shipment.id}>
                                            {shipment.shipmentNumber}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="filter-startDate" className="text-right">
                                Issue Date From
                            </Label>
                            <Input
                                id="filter-startDate"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="filter-endDate" className="text-right">
                                Issue Date To
                            </Label>
                            <Input
                                id="filter-endDate"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={clearFilters}>Clear</Button>
                        <Button onClick={applyFilters}>Apply Filters</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
