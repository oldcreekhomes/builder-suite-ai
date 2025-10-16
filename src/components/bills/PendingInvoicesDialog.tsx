import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BillsApprovalTable } from "@/components/bills/BillsApprovalTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

interface PendingInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectIds?: string[];
}

export function PendingInvoicesDialog({ open, onOpenChange, projectIds }: PendingInvoicesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Pending Invoices</DialogTitle>
          <DialogDescription>
            Review and approve invoices that need your attention.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 pb-6">
          <UniversalFilePreviewProvider>
            <Tabs defaultValue="review" className="w-full">
              <div className="max-w-sm">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="approve">Approved</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="relative max-w-sm mt-4 mb-6">
                <Input
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <TabsContent value="review" className="mt-0">
                <BillsApprovalTable 
                  status="draft"
                  projectIds={projectIds}
                  defaultSortBy="due_date"
                  sortOrder="asc"
                  enableSorting={true}
                  searchQuery={searchQuery}
                />
              </TabsContent>

              <TabsContent value="approve" className="mt-0">
                <BillsApprovalTable 
                  status={['posted', 'paid']}
                  projectIds={projectIds}
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
