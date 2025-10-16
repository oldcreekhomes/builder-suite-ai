import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
          <DialogTitle>Bills Ready to Pay</DialogTitle>
          <DialogDescription>
            These bills have been approved and are ready to be paid across all projects.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex-1 max-w-sm px-6">
          <Search className="absolute left-9 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-auto px-6 pb-6">
          <UniversalFilePreviewProvider>
            <BillsApprovalTable 
              status="posted"
              defaultSortBy="due_date"
              sortOrder="asc"
              enableSorting={true}
              showPayBillButton={true}
              searchQuery={searchQuery}
            />
          </UniversalFilePreviewProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
