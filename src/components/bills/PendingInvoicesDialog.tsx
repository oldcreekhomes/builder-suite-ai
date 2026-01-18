import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BillsApprovalTable } from "@/components/bills/BillsApprovalTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useBillCounts } from "@/hooks/useBillCounts";

interface PendingInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectIds?: string[];
  showProjectColumn?: boolean;
}

export function PendingInvoicesDialog({ open, onOpenChange, projectIds, showProjectColumn = true }: PendingInvoicesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: billCounts } = useBillCounts(undefined, projectIds);
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] h-[90vh] flex flex-col p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Pending Invoices</DialogTitle>
          <DialogDescription>
            Review and approve invoices that need your attention.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden px-6 pb-4">
          <UniversalFilePreviewProvider>
            <Tabs defaultValue="review" className="w-full h-full flex flex-col">
              <TabsList className="shrink-0">
                <TabsTrigger value="review" className="flex items-center gap-2">
                  Review
                  {billCounts && billCounts.pendingCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-auto rounded-full border-2 border-black h-6 min-w-6 px-2 flex items-center justify-center"
                    >
                      {billCounts.pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approve" className="flex items-center gap-2">
                  Approved
                  {billCounts && billCounts.approvedCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-auto rounded-full border-2 border-black h-6 min-w-6 px-2 flex items-center justify-center"
                    >
                      {(billCounts.approvedCount || 0) + (billCounts.payBillsCount || 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <div className="relative max-w-sm mt-2 mb-3 shrink-0">
                <Input
                  ref={searchRef}
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <TabsContent value="review" className="mt-0 flex-1 min-h-0">
                <BillsApprovalTable 
                  status="draft"
                  projectIds={projectIds}
                  showProjectColumn={showProjectColumn}
                  defaultSortBy="due_date"
                  sortOrder="asc"
                  enableSorting={true}
                  searchQuery={searchQuery}
                />
              </TabsContent>

              <TabsContent value="approve" className="mt-0 flex-1 min-h-0">
                <BillsApprovalTable 
                  status={['posted', 'paid']}
                  projectIds={projectIds}
                  showProjectColumn={showProjectColumn}
                  searchQuery={searchQuery}
                />
              </TabsContent>
            </Tabs>
          </UniversalFilePreviewProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
