import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BillAlertBadge } from "@/components/accounting/BillAlertBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { useBillCountsByProject } from "@/hooks/useBillCountsByProject";

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
  const navigate = useNavigate();
  
  const { data: billCounts, isLoading, error } = useBillCountsByProject([projectId]);
  
  const counts = billCounts?.[projectId] || { reviewCount: 0, approvedCount: 0, rejectedCount: 0, lateCount: 0, reviewLateCount: 0, approvedLateCount: 0 };
  const hasAlerts = counts.reviewCount > 0 || counts.approvedCount > 0 || counts.rejectedCount > 0 || counts.lateCount > 0;

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
                <span className="text-[10px] text-muted-foreground w-[48px] text-center">Review</span>
                <span className="text-[10px] text-muted-foreground w-[48px] text-center">Approved</span>
                <span className="text-[10px] text-muted-foreground w-[48px] text-center">Rejected</span>
              </div>
            </div>
            <div
              className="py-1 px-2 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between rounded"
              onClick={() => navigate(`/project/${projectId}/accounting/bills/approve?tab=review`)}
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
                <div className="w-[48px] flex justify-center">
                  <BillAlertBadge type="review" count={counts.reviewCount} overdue={counts.reviewLateCount} onOverdueClick={(e) => { e.stopPropagation(); navigate(`/project/${projectId}/accounting/bills/approve?tab=review&overdue=1`); }} />
                </div>
                <div className="w-[48px] flex justify-center">
                  <BillAlertBadge type="approved" count={counts.approvedCount} overdue={counts.approvedLateCount} onOverdueClick={(e) => { e.stopPropagation(); navigate(`/project/${projectId}/accounting/bills/approve?tab=approve&overdue=1`); }} />
                </div>
                <div className="w-[48px] flex justify-center">
                  <BillAlertBadge type="rejected" count={counts.rejectedCount} />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
