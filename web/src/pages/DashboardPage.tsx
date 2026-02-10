import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { ArrowUpRight, ArrowDownRight, RefreshCcw, FileText, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Mock Data ---

const kpiData = [
    { title: "Total Shipments", value: "1,284", change: "+12%", trend: "up", icon: FileText },
    { title: "Delivered Rate", value: "94.2%", change: "+2.4%", trend: "up", icon: CheckCircle },
    { title: "Pending eMeterai", value: "42", change: "-5", trend: "down", icon: Clock }, // count, so -5 is good/bad depending on context. Assuming down is good for pending.
    { title: "Success Rate", value: "98.5%", change: "+0.8%", trend: "up", icon: CheckCircle },
];

const funnelData = [
    { name: "Uploaded", value: 1200, fill: "#3b82f6" }, // Blue-500
    { name: "Delivered", value: 1100, fill: "#22c55e" }, // Green-500
    { name: "Invoiced", value: 950, fill: "#eab308" }, // Yellow-500
    { name: "eSigned", value: 900, fill: "#a855f7" }, // Purple-500
    { name: "Stamped", value: 850, fill: "#f97316" }, // Orange-500
];

const shipmentStatusData = [
    { name: "In Transit", value: 240, color: "#3b82f6" },
    { name: "Delivered", value: 980, color: "#22c55e" },
    { name: "Exception", value: 64, color: "#ef4444" },
];

const complianceStatusData = [
    { name: "Stamped", value: 850, color: "#22c55e" },
    { name: "SN Pending", value: 120, color: "#eab308" },
    { name: "Draft", value: 314, color: "#94a3b8" },
];

const auditLogs = [
    { id: 1, action: "INV-001 Stamped Successfully", time: "2 mins ago", status: "success" },
    { id: 2, action: "Shipment SHP-2024-002 Delivered", time: "15 mins ago", status: "success" },
    { id: 3, action: "eMeterai Quota Low (Warning)", time: "1 hour ago", status: "warning" },
    { id: 4, action: "New User Registration: Ahmad", time: "2 hours ago", status: "info" },
    { id: 5, action: "Integration Sync Failed", time: "4 hours ago", status: "error" },
];

// --- Components ---

export default function DashboardPage() {
    return (
        <div className="flex flex-1 flex-col gap-2 p-2 pt-0 h-[calc(100vh-4rem)] overflow-hidden">
            {/* 1. KPI Summary Row */}
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 shrink-0">
                {kpiData.map((kpi, index) => (
                    <Card key={index} className="p-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-1">
                            <CardTitle className="text-sm font-medium">
                                {kpi.title}
                            </CardTitle>
                            <kpi.icon className="h-3 w-3 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="text-xl font-bold">{kpi.value}</div>
                            <p className="text-[10px] text-muted-foreground flex items-center mt-1">
                                {kpi.trend === "up" ? (
                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={kpi.trend === "up" ? "text-green-500" : "text-red-500"}>
                                    {kpi.change}
                                </span>
                                <span className="ml-1">vs last month</span>
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-2 grid-cols-1 lg:grid-cols-4 flex-1 min-h-0">
                {/* Left Column (3/4): Funnel + Donuts */}
                <div className="lg:col-span-3 flex flex-col gap-2 min-h-0">
                    {/* 2. Flow Visualization */}
                    <Card className="flex-1 min-h-0 flex flex-col">
                        <CardHeader className="p-3 pb-0 shrink-0">
                            <CardTitle className="text-sm">Operation Pipeline</CardTitle>
                            <CardDescription className="text-xs">
                                Shipment conversion flow
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pl-0 pb-2 flex-1 min-h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={24}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" width={70} fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3. Status Breakdown */}
                    <div className="grid grid-cols-2 gap-2 shrink-0 h-[200px]">
                        <Card className="flex flex-col">
                            <CardHeader className="p-3 pb-0">
                                <CardTitle className="text-sm">Shipment Status</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 pb-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={shipmentStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {shipmentStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader className="p-3 pb-0">
                                <CardTitle className="text-sm">Compliance Status</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 pb-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={complianceStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {complianceStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                                        <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column (1/4): Gauge + Activity */}
                <div className="lg:col-span-1 flex flex-col gap-2 min-h-0">
                    {/* Gauge Chart */}
                    <Card className="shrink-0">
                        <CardHeader className="flex flex-row items-center justify-between p-3 pb-0 space-y-0">
                            <div className="space-y-0.5">
                                <CardTitle className="text-sm">eMeterai</CardTitle>
                                <CardDescription className="text-xs">Quota</CardDescription>
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6">
                                <RefreshCcw className="h-3 w-3" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="h-[100px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[{ value: 75 }, { value: 25 }]}
                                            cx="50%"
                                            cy="80%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={45}
                                            outerRadius={60}
                                            paddingAngle={0}
                                            dataKey="value"
                                        >
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#e2e8f0" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-x-0 bottom-3 text-center">
                                    <div className="text-2xl font-bold leading-none">75%</div>
                                </div>
                            </div>
                            <div className="text-center text-xs text-muted-foreground -mt-3">
                                7.5k / 10k
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="flex-1 min-h-0 flex flex-col">
                        <CardHeader className="p-3 shrink-0">
                            <CardTitle className="text-sm">Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 overflow-y-auto pr-1">
                            <div className="space-y-3">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-500' :
                                                log.status === 'warning' ? 'bg-yellow-500' :
                                                    log.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                                }`} />
                                            <p className="text-xs font-medium leading-none truncate" title={log.action}>
                                                {log.action}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground pl-3.5">
                                            {log.time}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
