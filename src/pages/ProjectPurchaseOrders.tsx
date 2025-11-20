import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProject";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useLotManagement } from "@/hooks/useLotManagement";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseOrdersTable } from "@/components/purchaseOrders/PurchaseOrdersTable";
import { FileText, Clock, CheckCircle, DollarSign } from "lucide-react";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
export default function ProjectPurchaseOrders() {
  const {
    projectId
  } = useParams<{
    projectId: string;
  }>();
  const {
    data: project
  } = useProject(projectId!);
  const { selectedLotId } = useLotManagement(projectId!);
  const {
    purchaseOrders,
    isLoading,
    error
  } = usePurchaseOrders(projectId!, selectedLotId);
  
  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading project...</h2>
        </div>
      </div>;
  }
  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => po.status === 'draft').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0)
  };
  return <UniversalFilePreviewProvider>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/40">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="flex flex-col min-h-screen">
            <DashboardHeader 
              title="Project Purchase Orders"
              projectId={projectId}
            />
            
            <main className="flex-1 space-y-4 p-4 md:p-6 pt-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                <p className="text-muted-foreground">
                  Manage purchase orders for this project
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total POs</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                      Total purchase orders
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting approval
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.approved}</div>
                    <p className="text-xs text-muted-foreground">
                      Ready to proceed
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Total order value
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Purchase Orders Table */}
              <PurchaseOrdersTable projectId={projectId!} projectAddress={project?.address} />
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  </UniversalFilePreviewProvider>;
}