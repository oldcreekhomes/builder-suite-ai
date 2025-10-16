import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, DollarSign } from "lucide-react";
import { useAccountingManagerBills } from "@/hooks/useAccountingManagerBills";
import { useBillsReadyToPay } from "@/hooks/useBillsReadyToPay";
import { PendingInvoicesDialog } from "@/components/bills/PendingInvoicesDialog";
import { BillsReadyToPayDialog } from "@/components/bills/BillsReadyToPayDialog";

export function ProjectWarnings() {
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isReadyToPayDialogOpen, setIsReadyToPayDialogOpen] = useState(false);
  
  const { data: pendingData, isLoading: pendingLoading, error: pendingError } = useAccountingManagerBills();
  const { data: readyToPayData, isLoading: readyToPayLoading, error: readyToPayError } = useBillsReadyToPay();

  const isLoading = pendingLoading || readyToPayLoading;
  const error = pendingError || readyToPayError;

  if (isLoading) {
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

  if (error) {
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

  const { pendingCount, currentCount, lateCount, projectIds } = pendingData || { 
    pendingCount: 0, 
    currentCount: 0, 
    lateCount: 0, 
    projectIds: [] 
  };
  const { count: readyToPayCount, projectIds: readyToPayProjectIds, hasAccess } = readyToPayData || { count: 0, projectIds: [], hasAccess: false };
  
  const hasAlerts = pendingCount > 0 || (hasAccess && readyToPayCount > 0);

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
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setIsPendingDialogOpen(true)}
                >
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium">Pending Invoices</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-8">
                    {/* Current Counter */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">Current</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-lg px-3 py-1">
                        {currentCount}
                      </Badge>
                    </div>
                    
                    {/* Late Counter */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground mb-1">Late</span>
                      <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-600 text-lg px-3 py-1">
                        {lateCount}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              {hasAccess && readyToPayCount > 0 && (
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => setIsReadyToPayDialogOpen(true)}
                >
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium">Bills Ready to Pay</span>
                  </div>
                  <Badge variant="secondary">{readyToPayCount}</Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PendingInvoicesDialog 
        open={isPendingDialogOpen} 
        onOpenChange={setIsPendingDialogOpen}
        projectIds={projectIds}
      />
      
      <BillsReadyToPayDialog 
        open={isReadyToPayDialogOpen} 
        onOpenChange={setIsReadyToPayDialogOpen}
      />
    </>
  );
}
