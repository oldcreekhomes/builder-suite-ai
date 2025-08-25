import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProject";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatePurchaseOrderDialog } from "@/components/CreatePurchaseOrderDialog";
import { Plus, FileText, Clock, CheckCircle, DollarSign, Paperclip } from "lucide-react";
export default function ProjectPurchaseOrders() {
  const {
    projectId
  } = useParams<{
    projectId: string;
  }>();
  const {
    data: project
  } = useProject(projectId!);
  const {
    purchaseOrders,
    isLoading,
    error
  } = usePurchaseOrders(projectId!);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
  const handleCreateSuccess = () => {
    // The hook will automatically refresh the data
  };
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/40">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="flex flex-col min-h-screen">
            <DashboardHeader title={`${project.name} - Purchase Orders`} />
            
            <main className="flex-1 space-y-4 p-4 md:p-6 pt-6">
              {/* Header with Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                  <p className="text-muted-foreground">
                    Manage purchase orders for this project
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Purchase Order
                </Button>
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

              {/* Purchase Orders List */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>
                    A list of all purchase orders for this project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="text-center py-6">
                      <div className="text-sm text-red-600">Error loading purchase orders: {error.message}</div>
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-6">
                      <div className="text-sm text-muted-foreground">Loading purchase orders...</div>
                    </div>
                  ) : purchaseOrders.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No purchase orders</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Get started by creating your first purchase order.
                      </p>
                      <div className="mt-6">
                        
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {purchaseOrders.map(po => (
                        <div key={po.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium">{(po.companies as any)?.company_name}</h3>
                                <Badge variant={po.status === 'approved' ? 'default' : 'secondary'}>
                                  {po.status}
                                </Badge>
                                {po.extra && <Badge variant="outline">EXTRA</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(po.cost_codes as any)?.code} - {(po.cost_codes as any)?.name}
                              </div>
                              {po.notes && <div className="text-sm text-muted-foreground">{po.notes}</div>}
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>Created {new Date(po.created_at).toLocaleDateString()}</span>
                                 {po.files && Array.isArray(po.files) && (po.files as any[]).length > 0 && (
                                   <div className="flex items-center space-x-1">
                                     <Paperclip className="h-3 w-3" />
                                     <span>{(po.files as any[]).length} file{(po.files as any[]).length !== 1 ? 's' : ''}</span>
                                   </div>
                                 )}
                              </div>
                            </div>
                            {po.total_amount > 0 && (
                              <div className="text-lg font-semibold">
                                ${po.total_amount.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>

      <CreatePurchaseOrderDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} projectId={projectId!} onSuccess={handleCreateSuccess} />
    </SidebarProvider>;
}