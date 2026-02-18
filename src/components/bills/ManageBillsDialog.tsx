import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillsApprovalTabs } from "@/components/bills/BillsApprovalTabs";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ManageBillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  projectIds?: string[];
}

export function ManageBillsDialog({ open, onOpenChange, projectId, projectIds }: ManageBillsDialogProps) {
  const { canAccessManageBills } = useAccountingPermissions();
  const { toast } = useToast();

  useEffect(() => {
    if (open && !canAccessManageBills) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage bills.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  }, [open, canAccessManageBills, onOpenChange, toast]);

  if (!canAccessManageBills) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Manage Bills</DialogTitle>
          <DialogDescription>
            Review, approve and locate invoices - all in one place.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 pb-6">
          <UniversalFilePreviewProvider>
            <BillsApprovalTabs projectId={projectId} projectIds={projectIds} reviewOnly={false} />
          </UniversalFilePreviewProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
