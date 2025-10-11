import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountingManagerBills } from "@/hooks/useAccountingManagerBills";
import { FileText, DollarSign } from "lucide-react";

export function AccountingUpdates() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAccountingManagerBills();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Bills Awaiting Your Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Bills Awaiting Your Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load bills. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { pendingCount, totalAmount, recentBills } = data || { 
    pendingCount: 0, 
    totalAmount: 0, 
    recentBills: [] 
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bills Awaiting Your Approval
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {pendingCount === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No bills awaiting approval
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pending Bills</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-2xl font-bold flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {totalAmount.toLocaleString('en-US', { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0 
                  })}
                </div>
                <div className="text-xs text-muted-foreground">Total Amount</div>
              </div>
            </div>

            <div className="space-y-3 flex-1 mb-4">
              {recentBills.map((bill) => (
                <div 
                  key={bill.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/approve-bills?project=${bill.project_id}`)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {bill.vendor_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {bill.project_address}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(bill.bill_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      ${bill.total_amount.toLocaleString('en-US', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => navigate('/approve-bills')}
              className="w-full mt-auto"
              variant="default"
            >
              Review All Bills
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
