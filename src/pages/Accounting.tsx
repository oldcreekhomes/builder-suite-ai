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

      // Get bills directly assigned to project
      const { data: directBills, error: directError } = await supabase
        .from('bills')
        .select('id, status, total_amount, due_date')
        .eq('project_id', projectId);

      if (directError) throw directError;

      // Get bills with line items assigned to project but bill header has no project
      const { data: indirectBills, error: indirectError } = await supabase
        .from('bills')
        .select(`
          id, status, total_amount, due_date,
          bill_lines!inner(project_id)
        `)
        .is('project_id', null)
        .eq('bill_lines.project_id', projectId);

      if (indirectError) throw indirectError;

      // Combine and deduplicate bills
      const allBills = [...(directBills || []), ...(indirectBills || [])];
      const uniqueBills = allBills.filter((bill, index, array) => 
        array.findIndex(b => b.id === bill.id) === index
      );

      const today = new Date().toISOString().split('T')[0];
      
      const pendingBills = uniqueBills?.filter(bill => bill.status === 'draft') || [];
      const postedBills = uniqueBills?.filter(bill => bill.status === 'posted') || [];
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


          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}