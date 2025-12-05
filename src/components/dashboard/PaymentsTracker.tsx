import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingInvoicesDialog } from "@/components/bills/PendingInvoicesDialog";

interface ProjectBillSummary {
  projectId: string;
  projectAddress: string;
  reviewCount: number;
  reviewAmount: number;
  fundCount: number;
  fundAmount: number;
  payCount: number;
  payAmount: number;
}

export function PaymentsTracker() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['payments-tracker-summary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'owner' ? user.id : userData?.home_builder_id;
      if (!ownerId) return [];

      const { data: bills, error } = await supabase
        .from('bills')
        .select(`
          id,
          status,
          total_amount,
          project_id,
          projects!inner(id, address)
        `)
        .eq('owner_id', ownerId)
        .in('status', ['draft', 'posted', 'paid']);

      if (error) {
        console.error('Error fetching bills:', error);
        return [];
      }

      const projectMap = new Map<string, ProjectBillSummary>();

      bills?.forEach((bill: any) => {
        const projectId = bill.project_id;
        const projectAddress = bill.projects?.address || 'Unknown Project';
        
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectAddress,
            reviewCount: 0,
            reviewAmount: 0,
            fundCount: 0,
            fundAmount: 0,
            payCount: 0,
            payAmount: 0,
          });
        }

        const summary = projectMap.get(projectId)!;
        const amount = Number(bill.total_amount) || 0;

        if (bill.status === 'draft') {
          summary.reviewCount++;
          summary.reviewAmount += amount;
        } else if (bill.status === 'posted') {
          summary.fundCount++;
          summary.fundAmount += amount;
        } else if (bill.status === 'paid') {
          summary.payCount++;
          summary.payAmount += amount;
        }
      });

      return Array.from(projectMap.values()).sort((a, b) => 
        a.projectAddress.localeCompare(b.projectAddress)
      );
    },
    refetchInterval: 30000,
  });

  const handleCountClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDialogOpen(true);
  };

  const totals = summaries.reduce(
    (acc, s) => ({
      reviewCount: acc.reviewCount + s.reviewCount,
      reviewAmount: acc.reviewAmount + s.reviewAmount,
      fundCount: acc.fundCount + s.fundCount,
      fundAmount: acc.fundAmount + s.fundAmount,
      payCount: acc.payCount + s.payCount,
      payAmount: acc.payAmount + s.payAmount,
    }),
    { reviewCount: 0, reviewAmount: 0, fundCount: 0, fundAmount: 0, payCount: 0, payAmount: 0 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Payments</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Project</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Review</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Fund</th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Pay</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                  No bills found
                </td>
              </tr>
            ) : (
              <>
                {summaries.map((summary) => (
                  <tr key={summary.projectId} className="border-b">
                    <td className="py-1.5 px-2 text-xs font-medium truncate max-w-[140px]">
                      {summary.projectAddress}
                    </td>
                    <td className="text-center py-1.5 px-2 text-xs">
                      {summary.reviewCount > 0 ? (
                        <span 
                          className="cursor-pointer hover:text-primary hover:underline"
                          onClick={() => handleCountClick(summary.projectId)}
                        >
                          {summary.reviewCount}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-center py-1.5 px-2 text-xs">
                      {summary.fundCount > 0 ? (
                        <span 
                          className="cursor-pointer hover:text-primary hover:underline"
                          onClick={() => handleCountClick(summary.projectId)}
                        >
                          {summary.fundCount}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="text-center py-1.5 px-2 text-xs">
                      {summary.payCount > 0 ? (
                        <span 
                          className="cursor-pointer hover:text-primary hover:underline"
                          onClick={() => handleCountClick(summary.projectId)}
                        >
                          {summary.payCount}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-medium">
                  <td className="py-1.5 px-2 text-xs">Total</td>
                  <td className="text-center py-1.5 px-2 text-xs">{totals.reviewCount || "—"}</td>
                  <td className="text-center py-1.5 px-2 text-xs">{totals.fundCount || "—"}</td>
                  <td className="text-center py-1.5 px-2 text-xs">{totals.payCount || "—"}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </CardContent>

      <PendingInvoicesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectIds={selectedProjectId ? [selectedProjectId] : undefined}
      />
    </Card>
  );
}
