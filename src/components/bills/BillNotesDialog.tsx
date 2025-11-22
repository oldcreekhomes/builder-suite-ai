import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";

interface BillNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billInfo: {
    vendor: string;
    amount: number;
  };
  initialValue: string;
  onSave: (notes: string) => void;
}

export function BillNotesDialog({
  open,
  onOpenChange,
  billInfo,
  initialValue,
  onSave,
}: BillNotesDialogProps) {
  const [notes, setNotes] = useState(initialValue);

  const handleSave = () => {
    onSave(notes);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNotes(initialValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-yellow-600" />
            Bill Notes
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {billInfo.vendor} - ${billInfo.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Add notes for this bill..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px] resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
