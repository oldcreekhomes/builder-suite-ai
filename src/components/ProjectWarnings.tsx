import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { useAccountingManagerBills } from "@/hooks/useAccountingManagerBills";

// Helper function to get street address only (before first comma)
const getStreetAddress = (address: string) => {
  if (!address) return '';
  const commaIndex = address.indexOf(',');
  return commaIndex > -1 ? address.substring(0, commaIndex) : address;
};

export function ProjectWarnings() {
  const navigate = useNavigate();
  
  const { data: pendingData, isLoading: pendingLoading, error: pendingError } = useAccountingManagerBills();

  if (pendingLoading) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
          </div>
        </div>
        <CardContent className="p-6 flex-1">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (pendingError) {
    return (
      <Card className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
          </div>
        </div>
        <CardContent className="p-6 flex-1">
          <p className="text-sm text-muted-foreground">Unable to load warnings</p>
        </CardContent>
      </Card>
    );
  }

  const { projectsWithCounts } = pendingData || { 
    projectsWithCounts: [] 
  };
  
  const hasAlerts = projectsWithCounts.some(p => p.totalCount > 0);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
        </div>
      </div>
      <CardContent className="p-0 flex-1 overflow-hidden">
        {!hasAlerts ? (
          <div className="p-6 text-sm text-muted-foreground">
            No pending warnings
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="px-4 py-2">
              {/* Column headers */}
              <div className="flex items-center justify-end mb-1 pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground text-center min-w-[24px]">Current</span>
                  <span className="text-[10px] text-muted-foreground text-center min-w-[24px]">Late</span>
                </div>
              </div>
              {projectsWithCounts.map((project) => (
                project.totalCount > 0 && (
                  <div
                    key={project.projectId}
                    className="py-1 px-2 cursor-pointer hover:bg-muted/50 transition-colors flex items-center rounded"
                    onClick={() => navigate(`/project/${project.projectId}`)}
                  >
                    <div className="flex-1 min-w-0 overflow-hidden mr-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm block truncate">
                              {getStreetAddress(project.projectAddress)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{project.projectAddress}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 min-w-[24px] justify-center">
                        {project.currentCount}
                      </Badge>
                      <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-600 min-w-[24px] justify-center">
                        {project.lateCount}
                      </Badge>
                    </div>
                  </div>
                )
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
