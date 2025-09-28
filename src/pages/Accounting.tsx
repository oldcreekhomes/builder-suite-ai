import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AccountingSidebar } from "@/components/sidebar/AccountingSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Clock } from "lucide-react";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";
import { useProject } from "@/hooks/useProject";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Accounting() {
  const { projectId } = useParams();
  const { openFloatingChat } = useFloatingChat();
  const { data: project } = useProject(projectId || "");
  
  // Fetch bill metrics for this project
  const { data: billMetrics, isLoading } = useQuery({
    queryKey: ['bill-metrics', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, status, total_amount, due_date')
        .eq('project_id', projectId);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      
      const pendingBills = bills?.filter(bill => bill.status === 'draft') || [];
      const postedBills = bills?.filter(bill => bill.status === 'posted') || [];
      const overdueBills = postedBills.filter(bill => 
        bill.due_date && bill.due_date < today
      ) || [];

      const totalOutstanding = postedBills.reduce((sum, bill) => 
        sum + (bill.total_amount || 0), 0
      );

      return {
        pendingCount: pendingBills.length,
        totalOutstanding,
        overdueCount: overdueBills.length
      };
    },
    enabled: !!projectId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AccountingSidebar projectId={projectId} />
        <SidebarInset className="flex-1 flex flex-col">
          <DashboardHeader 
            title={`Accounting Dashboard${project?.address ? ` - ${project.address}` : ''}`} 
            projectId={projectId}
          />
          <div className="flex-1 p-6 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      billMetrics?.pendingCount || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bills awaiting approval
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      formatCurrency(billMetrics?.totalOutstanding || 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approved bills pending payment
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-8" />
                    ) : (
                      billMetrics?.overdueCount || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bills past due date
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common accounting tasks and workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Review Pending Bills</h3>
                  <p className="text-sm text-muted-foreground">
                    View and approve bills awaiting authorization
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Enter New Bills</h3>
                  <p className="text-sm text-muted-foreground">
                    Add new bills to the system for processing
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Payment Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate reports for accounting periods
                  </p>
                </div>
                <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <h3 className="font-medium mb-2">Vendor Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage vendor information and payment terms
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}