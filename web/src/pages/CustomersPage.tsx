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
import { Trash2, Edit, Plus } from "lucide-react";

interface Customer {
    id: string;
    customerId: string;
    name: string;
    emailAddress?: string | null;
    createdBy?: string | null;
    createdByName?: string | null;
    updatedAt: string;
    createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        customerId: "",
        name: "",
        emailAddress: "",
        createdBy: "",
    });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/customers`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data);
            } else {
                console.error("Failed to fetch customers");
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreate = async () => {
        try {
            const res = await fetch(`${API_URL}/api/customers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
                credentials: "include",
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setFormData({ customerId: "", name: "", emailAddress: "", createdBy: "" });
                fetchCustomers();
            } else {
                console.error("Failed to create customer");
            }
        } catch (error) {
            console.error("Error creating customer:", error);
        }
    };

    const handleUpdate = async () => {
        if (!currentCustomer) return;

        try {
            const res = await fetch(`${API_URL}/api/customers/${currentCustomer.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
                credentials: "include",
            });

            if (res.ok) {
                setIsEditDialogOpen(false);
                setCurrentCustomer(null);
                setFormData({ customerId: "", name: "", emailAddress: "", createdBy: "" });
                fetchCustomers();
            } else {
                console.error("Failed to update customer");
            }
        } catch (error) {
            console.error("Error updating customer:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this customer?")) return;

        try {
            const res = await fetch(`${API_URL}/api/customers/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (res.ok) {
                fetchCustomers();
            } else {
                console.error("Failed to delete customer");
            }
        } catch (error) {
            console.error("Error deleting customer:", error);
        }
    };

    const openEditDialog = (customer: Customer) => {
        setCurrentCustomer(customer);
        setFormData({
            customerId: customer.customerId,
            name: customer.name,
            emailAddress: customer.emailAddress || "",
            createdBy: customer.createdByName || customer.createdBy || "",
        });
        setIsEditDialogOpen(true);
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Customers</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Customer</DialogTitle>
                            <DialogDescription>
                                Create a new customer record.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="customerId" className="text-right">
                                    Customer ID
                                </Label>
                                <Input
                                    id="customerId"
                                    name="customerId"
                                    value={formData.customerId}
                                    onChange={handleInputChange}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="emailAddress" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="emailAddress"
                                    name="emailAddress"
                                    type="email"
                                    value={formData.emailAddress}
                                    onChange={handleInputChange}
                                    className="col-span-3"
                                    placeholder="example@domain.com"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Created By</TableHead>
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
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>{customer.customerId}</TableCell>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.emailAddress || "-"}</TableCell>
                                    <TableCell>{customer.createdByName || customer.createdBy || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(customer)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDelete(customer.id)}
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
                        <DialogTitle>Edit Customer</DialogTitle>
                        <DialogDescription>
                            Update customer details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-customerId" className="text-right">
                                Customer ID
                            </Label>
                            <Input
                                id="edit-customerId"
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="edit-name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-emailAddress" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="edit-emailAddress"
                                name="emailAddress"
                                type="email"
                                value={formData.emailAddress}
                                onChange={handleInputChange}
                                className="col-span-3"
                                placeholder="example@domain.com"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-createdBy" className="text-right">
                                Created By
                            </Label>
                            <Input
                                id="edit-createdBy"
                                name="createdBy"
                                value={formData.createdBy}
                                disabled
                                className="col-span-3 bg-muted"
                            />
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
