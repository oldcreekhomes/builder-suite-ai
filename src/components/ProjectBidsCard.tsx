import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Gavel, CheckCircle2 } from "lucide-react";
import { usePMBidNotifications } from "@/hooks/usePMBidNotifications";
import { ProjectBidsDialog } from "@/components/ProjectBidsDialog";

// Helper function to get street address only (before first comma)
const getStreetAddress = (address: string) => {
  if (!address) return "";
  const commaIndex = address.indexOf(",");
  return commaIndex > -1 ? address.substring(0, commaIndex) : address;
};

export function ProjectBidsCard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectAddress, setSelectedProjectAddress] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, error } = usePMBidNotifications();

  const handleProjectClick = (projectId: string, projectAddress: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectAddress(projectAddress);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Gavel className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Project Bids</h3>
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
            <Gavel className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Project Bids</h3>
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Unable to load bid notifications</p>
        </CardContent>
      </Card>
    );
  }

  const { projectCounts = [] } = data || {};
  const hasNotifications = projectCounts.length > 0;

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Gavel className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Project Bids</h3>
          </div>
        </div>
        <CardContent className="p-0 flex-1 overflow-hidden">
          {!hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm font-medium text-foreground">All Caught Up</p>
              <p className="text-xs text-muted-foreground">No pending bid notifications</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
            <div className="px-4 py-2">
              {/* Column headers */}
              <div className="flex items-center justify-end mb-1 pr-1">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground w-[40px] text-center">
                    Will Bid
                  </span>
                  <span className="text-[10px] text-muted-foreground w-[40px] text-center">
                    Bid
                  </span>
                </div>
              </div>
              {projectCounts.map((project) => (
                <div
                  key={project.projectId}
                  className="py-1 px-2 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between rounded"
                  onClick={() => handleProjectClick(project.projectId, project.projectAddress)}
                >
                  <div className="flex items-center min-w-0 flex-1 mr-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm truncate">
                            {getStreetAddress(project.projectAddress)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{project.projectAddress}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-[40px] flex justify-center">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 hover:bg-green-100"
                      >
                        {project.willBidCount}
                      </Badge>
                    </div>

                    <div className="w-[40px] flex justify-center">
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                      >
                        {project.bidCount}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ProjectBidsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={selectedProjectId}
        projectAddress={selectedProjectAddress}
      />
    </>
  );
}
