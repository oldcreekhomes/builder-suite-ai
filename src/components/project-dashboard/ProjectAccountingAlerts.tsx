import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { useBillCountsByProject } from "@/hooks/useBillCountsByProject";
import { PendingInvoicesDialog } from "@/components/bills/PendingInvoicesDialog";

// Helper function to get street address only (before first comma)
const getStreetAddress = (address: string) => {
  if (!address) return '';
  const commaIndex = address.indexOf(',');
  return commaIndex > -1 ? address.substring(0, commaIndex) : address;
};

interface ProjectAccountingAlertsProps {
  projectId: string;
  projectAddress: string;
}

export function ProjectAccountingAlerts({ projectId, projectAddress }: ProjectAccountingAlertsProps) {
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  
  const { data: billCounts, isLoading, error } = useBillCountsByProject([projectId]);
  
  const counts = billCounts?.[projectId] || { currentCount: 0, lateCount: 0 };
  const hasAlerts = counts.currentCount > 0 || counts.lateCount > 0;

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
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
            <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Unable to load alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
          </div>
        </div>
        <CardContent className="p-0">
          {!hasAlerts ? (
            <div className="p-6 text-sm text-muted-foreground">
              No pending alerts for this project
            </div>
          ) : (
            <div className="px-4 py-2">
              {/* Column headers - shown once */}
              <div className="flex items-center justify-end mb-1 pr-1">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground w-[40px] text-center">Current</span>
                  <span className="text-[10px] text-muted-foreground w-[40px] text-center">Late</span>
                </div>
              </div>
              <div
                className="py-1 px-2 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between rounded"
                onClick={() => setIsPendingDialogOpen(true)}
              >
                <div className="flex items-center min-w-0 flex-1 mr-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm truncate">
                          {getStreetAddress(projectAddress)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{projectAddress}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-[40px] flex justify-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                      {counts.currentCount}
                    </Badge>
                  </div>
                  
                  <div className="w-[40px] flex justify-center">
                    <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-600">
                      {counts.lateCount}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PendingInvoicesDialog 
        open={isPendingDialogOpen} 
        onOpenChange={setIsPendingDialogOpen}
        projectIds={[projectId]}
      />
    </>
  );
}
