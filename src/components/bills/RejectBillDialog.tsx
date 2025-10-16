import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePendingBills } from "@/hooks/usePendingBills";

interface RejectBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUploadId: string;
  vendorName?: string;
}

export function RejectBillDialog({
  open,
  onOpenChange,
  pendingUploadId,
  vendorName,
}: RejectBillDialogProps) {
  const { rejectBill } = usePendingBills();
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReject = () => {
    rejectBill.mutate(
      { pendingUploadId, reviewNotes },
      {
        onSuccess: () => {
          setReviewNotes("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setReviewNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reject Bill</DialogTitle>
          <DialogDescription>
            Are you sure you want to reject this bill
            {vendorName && ` from ${vendorName}`}? Please provide a reason for the accountant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="review-notes" className="text-sm font-medium">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="review-notes"
              placeholder="Explain why this bill is being rejected..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              This note will be visible to the accountant to help them understand the rejection.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={rejectBill.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectBill.isPending || !reviewNotes.trim()}
          >
            {rejectBill.isPending ? "Rejecting..." : "Reject Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
