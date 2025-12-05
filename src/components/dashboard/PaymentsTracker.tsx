import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { DollarSign, FileText, CheckCircle, CreditCard } from "lucide-react";

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
  const navigate = useNavigate();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['payments-tracker-summary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get owner_id for the current user
      const { data: userData } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'owner' ? user.id : userData?.home_builder_id;
      if (!ownerId) return [];

      // Fetch all bills with project info
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

      // Group by project and status
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

        // Map statuses: draft → Review (Tue), posted → Fund (Wed), paid → Pay (Thu)
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payments Workflow
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track bills through Review (Tue) → Fund (Wed) → Pay (Thu)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Project</th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center">
                    <FileText className="h-4 w-4 mb-1 text-yellow-600" />
                    <span>Review (Tue)</span>
                    <span className="text-xs text-muted-foreground">Draft</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center">
                    <DollarSign className="h-4 w-4 mb-1 text-blue-600" />
                    <span>Fund (Wed)</span>
                    <span className="text-xs text-muted-foreground">Posted</span>
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-4 w-4 mb-1 text-green-600" />
                    <span>Pay (Thu)</span>
                    <span className="text-xs text-muted-foreground">Paid</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No bills found
                  </td>
                </tr>
              ) : (
                <>
                  {summaries.map((summary) => (
                    <tr 
                      key={summary.projectId} 
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/project/${summary.projectId}/accounting`)}
                    >
                      <td className="py-3 px-2">
                        <span className="font-medium">{summary.projectAddress}</span>
                      </td>
                      <td className="text-center py-3 px-2">
                        {summary.reviewCount > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              {summary.reviewCount}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(summary.reviewAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {summary.fundCount > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {summary.fundCount}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(summary.fundAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-2">
                        {summary.payCount > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {summary.payCount}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(summary.payAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-muted/30 font-medium">
                    <td className="py-3 px-2">Total</td>
                    <td className="text-center py-3 px-2">
                      {totals.reviewCount > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="bg-yellow-600">
                            {totals.reviewCount}
                          </Badge>
                          <span className="text-sm">
                            {formatCurrency(totals.reviewAmount)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {totals.fundCount > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="bg-blue-600">
                            {totals.fundCount}
                          </Badge>
                          <span className="text-sm">
                            {formatCurrency(totals.fundAmount)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {totals.payCount > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="bg-green-600">
                            {totals.payCount}
                          </Badge>
                          <span className="text-sm">
                            {formatCurrency(totals.payAmount)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
