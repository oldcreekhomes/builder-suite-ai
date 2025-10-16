import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillsApprovalTable } from "@/components/bills/BillsApprovalTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

interface BillsReadyToPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsReadyToPayDialog({ open, onOpenChange }: BillsReadyToPayDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Ready for Review</DialogTitle>
          <DialogDescription>
            Review bills that are ready to pay or have been rejected across all projects.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 pb-6">
          <UniversalFilePreviewProvider>
            <Tabs defaultValue="ready-to-pay" className="w-full">
              <div className="max-w-sm">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ready-to-pay">Ready to Pay</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="relative max-w-sm mt-4 mb-6">
                <Input
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <TabsContent value="ready-to-pay" className="mt-0">
                <BillsApprovalTable 
                  status="posted"
                  defaultSortBy="due_date"
                  sortOrder="asc"
                  enableSorting={true}
                  showPayBillButton={true}
                  searchQuery={searchQuery}
                />
              </TabsContent>

              <TabsContent value="rejected" className="mt-0">
                <BillsApprovalTable 
                  status="void"
                  defaultSortBy="due_date"
                  sortOrder="asc"
                  enableSorting={true}
                  searchQuery={searchQuery}
                  showEditButton={true}
                />
              </TabsContent>
            </Tabs>
          </UniversalFilePreviewProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
