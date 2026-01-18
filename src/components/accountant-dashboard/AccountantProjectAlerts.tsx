import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText } from "lucide-react";
import { useCompanyWideBillAlerts } from "@/hooks/useCompanyWideBillAlerts";
import { PendingInvoicesDialog } from "@/components/bills/PendingInvoicesDialog";

export function AccountantProjectAlerts() {
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  
  const { data: pendingData, isLoading: pendingLoading, error: pendingError } = useCompanyWideBillAlerts();

  if (pendingLoading) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Project Alerts</h3>
          </div>
        </div>
        <CardContent className="p-6">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (pendingError) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Project Alerts</h3>
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Unable to load warnings</p>
        </CardContent>
      </Card>
    );
  }

  const { pendingCount, currentCount, lateCount } = pendingData || { 
    pendingCount: 0, 
    currentCount: 0, 
    lateCount: 0 
  };
  
  const hasAlerts = pendingCount > 0;

  return (
    <>
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Project Alerts</h3>
          </div>
        </div>
        <CardContent className="p-0">
          {!hasAlerts ? (
            <div className="p-6 text-sm text-muted-foreground">
              No pending warnings
            </div>
          ) : (
            <div className="divide-y">
              {pendingCount > 0 && (
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => setIsPendingDialogOpen(true)}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium">Pending Invoices</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">Current</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                        {currentCount}
                      </Badge>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">Late</span>
                      <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-600">
                        {lateCount}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PendingInvoicesDialog 
        open={isPendingDialogOpen} 
        onOpenChange={setIsPendingDialogOpen}
      />
    </>
  );
}
