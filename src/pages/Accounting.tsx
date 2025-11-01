import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountingGuard } from "@/components/guards/AccountingGuard";

export default function Accounting() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // Fetch bill metrics for this project
  const { data: billMetrics, isLoading } = useQuery({
    queryKey: ['bill-metrics', projectId],
    queryFn: async () => {
      if (projectId) {
        // Project-specific metrics
        const { data: directBills, error: directError } = await supabase
          .from('bills')
          .select('id, status, total_amount, due_date')
          .eq('project_id', projectId);

        if (directError) throw directError;

        const { data: indirectBills, error: indirectError } = await supabase
          .from('bills')
          .select(`
            id, status, total_amount, due_date,
            bill_lines!inner(project_id)
          `)
          .is('project_id', null)
          .eq('bill_lines.project_id', projectId);

        if (indirectError) throw indirectError;

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
          totalOutstandingCount: postedBills.length,
          overdueCount: overdueBills.length
        };
      } else {
        const { data: bills, error } = await supabase
          .from('bills')
          .select('id, status, total_amount, due_date');

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
          totalOutstandingCount: postedBills.length,
          overdueCount: overdueBills.length
        };
      }
    },
    enabled: true,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePendingBillsClick = () => {
    const path = projectId ? `/project/${projectId}/accounting/bills/approve` : '/accounting/bills/approve';
    navigate(path);
  };

  const handleTotalOutstandingClick = () => {
    const path = projectId ? `/project/${projectId}/accounting/bills/approve` : '/accounting/bills/approve';
    navigate(path);
  };
  
  return (
    <AccountingGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <DashboardHeader 
              title="Accounting"
              projectId={projectId}
            />
            
            <div className="flex-1 p-6 space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={handlePendingBillsClick}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bills Pending Approval</CardTitle>
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
                
                <Card className="cursor-pointer hover:bg-accent/5 transition-colors" onClick={handleTotalOutstandingClick}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bills Needing to be Paid</CardTitle>
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
                      {isLoading ? (
                        <Skeleton className="h-4 w-32" />
                      ) : (
                        `${billMetrics?.totalOutstandingCount || 0} approved bills pending payment`
                      )}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
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
    </AccountingGuard>
  );
}