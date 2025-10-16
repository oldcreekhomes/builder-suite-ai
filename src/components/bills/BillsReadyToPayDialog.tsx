import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillsApprovalTable } from "@/components/bills/BillsApprovalTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

interface BillsReadyToPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsReadyToPayDialog({ open, onOpenChange }: BillsReadyToPayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Bills Ready to Pay</DialogTitle>
          <DialogDescription>
            These bills have been approved and are ready to be paid across all projects.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 pb-6">
          <UniversalFilePreviewProvider>
            <BillsApprovalTable 
              status="posted"
              defaultSortBy="due_date"
              sortOrder="asc"
              enableSorting={true}
            />
          </UniversalFilePreviewProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
