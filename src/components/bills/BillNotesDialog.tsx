import React, { useState, useEffect } from "react";
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
  const [newNote, setNewNote] = useState("");

  // Reset new note when dialog opens
  useEffect(() => {
    if (open) {
      setNewNote("");
    }
  }, [open]);

  const handleSave = () => {
    onSave(newNote);
    setNewNote("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNewNote("");
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
          {/* New note input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Add a note</label>
            <Textarea
              placeholder="Type your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Existing notes (read-only) */}
          {initialValue && (
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Previous notes</label>
              <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {initialValue}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!newNote.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
