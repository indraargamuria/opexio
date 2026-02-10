import { useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    if (!session) {
        navigate("/login");
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <Button onClick={handleSignOut} variant="outline">
                        Sign out
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Welcome, {session.user?.name}!</CardTitle>
                        <CardDescription>You're successfully signed in</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-base">{session.user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">User ID</p>
                            <p className="text-base font-mono text-sm">{session.user?.id}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Session</p>
                            <p className="text-base">Active</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Session Details</CardTitle>
                        <CardDescription>Your current session information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-xs">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
