import { Home, Receipt, Truck, User } from "lucide-react"
import OpexioLogo from "@/assets/opexio_logo.png"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Customers",
        url: "/dashboard/customers",
        icon: User,
    },
    {
        title: "Shipments",
        url: "/dashboard/shipments",
        icon: Truck,
    },
    {
        title: "Invoices",
        url: "/dashboard/invoices",
        icon: Receipt,
    },
]

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarContent>
                <SidebarGroup>
                    <div className="flex items-center justify-center p-4">
                        <img src={OpexioLogo} alt="Opexio" className="h-8 w-auto" />
                    </div>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
