import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAccountingManagerBills } from "@/hooks/useAccountingManagerBills";
import { useUpdateProjectQBInvoiceDates } from "@/hooks/useUpdateProjectQBInvoiceDates";

// Helper function to get street address only (before first comma)
const getStreetAddress = (address: string) => {
  if (!address) return '';
  const commaIndex = address.indexOf(',');
  return commaIndex > -1 ? address.substring(0, commaIndex) : address;
};

export function ProjectWarnings() {
  const navigate = useNavigate();
  const updateDate = useUpdateProjectQBInvoiceDates();

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

  const { projectsWithCounts } = pendingData || { projectsWithCounts: [] };

  const handleDateSelect = (
    projectId: string,
    field: 'invoices_approved' | 'invoices_paid',
    date: Date | undefined
  ) => {
    const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
    updateDate.mutate({ projectId, field, date: dateStr });
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold text-black">Accounting Alerts</h3>
        </div>
      </div>
      <CardContent className="p-0 flex-1 overflow-hidden">
        {projectsWithCounts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-sm">All Caught Up</p>
              <p className="text-xs text-muted-foreground">No active projects</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="px-4 py-2">
              {/* Column headers */}
              <div className="flex items-center justify-end mb-1 pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground text-center w-[50px]">Current</span>
                  <span className="text-[10px] text-muted-foreground text-center w-[50px]">Late</span>
                  <span className="text-[10px] text-muted-foreground text-center w-[95px]">Approved</span>
                  <span className="text-[10px] text-muted-foreground text-center w-[95px]">Paid</span>
                </div>
              </div>
              {projectsWithCounts.map((project) => {
                const approvedDate = project.qbInvoicesApprovedDate
                  ? new Date(project.qbInvoicesApprovedDate + 'T00:00:00')
                  : undefined;
                const paidDate = project.qbInvoicesPaidDate
                  ? new Date(project.qbInvoicesPaidDate + 'T00:00:00')
                  : undefined;
                return (
                  <div
                    key={project.projectId}
                    className="py-1 px-2 pr-1 cursor-pointer hover:bg-muted/50 transition-colors flex items-center rounded"
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
                      <div className="w-[50px] flex justify-center">
                        {project.currentCount > 0 ? (
                          <span className="bg-green-100 text-green-700 rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium px-1.5">
                            {project.currentCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="w-[50px] flex justify-center">
                        {project.lateCount > 0 ? (
                          <span className="bg-red-600 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium px-1.5">
                            {project.lateCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div
                        className="w-[95px] flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 px-2 text-xs font-normal",
                                !approvedDate && "text-muted-foreground"
                              )}
                            >
                              {approvedDate ? format(approvedDate, "MMM dd, yyyy") : "—"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={approvedDate}
                              onSelect={(date) => handleDateSelect(project.projectId, 'invoices_approved', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                            {approvedDate && (
                              <div className="p-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => handleDateSelect(project.projectId, 'invoices_approved', undefined)}
                                >
                                  Clear date
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div
                        className="w-[95px] flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 px-2 text-xs font-normal",
                                !paidDate && "text-muted-foreground"
                              )}
                            >
                              {paidDate ? format(paidDate, "MMM dd, yyyy") : "—"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={paidDate}
                              onSelect={(date) => handleDateSelect(project.projectId, 'invoices_paid', date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                            {paidDate && (
                              <div className="p-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => handleDateSelect(project.projectId, 'invoices_paid', undefined)}
                                >
                                  Clear date
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
