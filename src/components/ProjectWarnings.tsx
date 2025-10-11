import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText } from "lucide-react";
import { useAccountingManagerBills } from "@/hooks/useAccountingManagerBills";
import { ManageBillsDialog } from "@/components/bills/ManageBillsDialog";

export function ProjectWarnings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, isLoading, error } = useAccountingManagerBills();

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Project Warnings</h3>
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
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Project Warnings</h3>
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Unable to load warnings</p>
        </CardContent>
      </Card>
    );
  }

  const { pendingCount } = data || { pendingCount: 0 };

  return (
    <>
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Project Warnings</h3>
          </div>
        </div>
        <CardContent className="p-0">
          {pendingCount === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No pending warnings
            </div>
          ) : (
            <div
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
              onClick={() => setIsDialogOpen(true)}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">Pending Invoices</span>
              </div>
              <Badge variant="secondary">{pendingCount}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <ManageBillsDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
