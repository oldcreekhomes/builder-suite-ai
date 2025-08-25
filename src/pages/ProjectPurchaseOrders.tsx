import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, DollarSign } from "lucide-react";

export default function ProjectPurchaseOrders() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <h1 className="text-lg font-semibold">
              Purchase Orders - {project?.name || 'Loading...'}
            </h1>
          </header>
          
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
                <p className="text-muted-foreground">
                  Manage purchase orders for {project?.name || 'this project'}
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total POs</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">No purchase orders yet</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Ready to send</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">Total PO value</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Purchase Orders List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Purchase Orders</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by creating your first purchase order for this project.
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Purchase Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}