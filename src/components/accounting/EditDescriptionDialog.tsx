import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: string;
  sourceId: string;
  journalEntryId: string;
  currentDescription: string;
  onSaved?: (newDescription: string) => void;
}

export function EditDescriptionDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  journalEntryId,
  currentDescription,
  onSaved,
}: EditDescriptionDialogProps) {
  const [description, setDescription] = useState(currentDescription);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const isConsolidated = sourceType === 'consolidated_bill_payment';
      const isSyntheticJe = !journalEntryId || journalEntryId.startsWith('consolidated:');

      if (isConsolidated) {
        // Consolidated bill payment: description lives on bill_payments.memo
        await supabase
          .from('bill_payments')
          .update({ memo: description })
          .eq('id', sourceId);
      } else if (sourceType === 'bill_payment') {
        // Single-bill payment: sourceId is the bill's id; description is read from bill_lines[0].memo
        const { data: lines } = await supabase
          .from('bill_lines')
          .select('id, line_number')
          .eq('bill_id', sourceId)
          .order('line_number', { ascending: true })
          .limit(1);

        if (lines && lines.length > 0) {
          await supabase
            .from('bill_lines')
            .update({ memo: description })
            .eq('id', (lines[0] as any).id);
        }
      } else {
        // Default behavior for bill, check, deposit, credit_card, manual
        const lineTable = getLineTable(sourceType);
        const parentColumn = getParentColumn(sourceType);

        if (lineTable && parentColumn) {
          const { data: lines } = await supabase
            .from(lineTable as any)
            .select('id, line_number')
            .eq(parentColumn, sourceId)
            .order('line_number', { ascending: true })
            .limit(1);

          if (lines && lines.length > 0) {
            await supabase
              .from(lineTable as any)
              .update({ memo: description } as any)
              .eq('id', (lines[0] as any).id);
          }
        }
      }

      // Keep GL ledger memos in sync (skip for synthetic consolidated journal entry ids)
      if (!isSyntheticJe) {
        const { data: jeLines } = await supabase
          .from('journal_entry_lines')
          .select('id')
          .eq('journal_entry_id', journalEntryId)
          .limit(1);

        if (jeLines && jeLines.length > 0) {
          await supabase
            .from('journal_entry_lines')
            .update({ memo: description })
            .eq('journal_entry_id', journalEntryId);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
      if (isConsolidated || sourceType === 'bill_payment') {
        await queryClient.invalidateQueries({ queryKey: ['bill-payments-reconciliation'] });
      }

      toast({ title: "Description Updated", description: "The transaction description has been updated." });
      onSaved?.(description);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating description:', error);
      toast({ title: "Error", description: "Failed to update description.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Description</DialogTitle>
        </DialogHeader>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description..."
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getLineTable(sourceType: string): string | null {
  switch (sourceType) {
    case 'bill': return 'bill_lines';
    case 'check': return 'check_lines';
    case 'deposit': return 'deposit_lines';
    case 'credit_card': return 'credit_card_lines';
    case 'manual': return 'journal_entry_lines';
    case 'bill_payment': return 'journal_entry_lines';
    case 'consolidated_bill_payment': return 'journal_entry_lines';
    default: return null;
  }
}

function getParentColumn(sourceType: string): string | null {
  switch (sourceType) {
    case 'bill': return 'bill_id';
    case 'check': return 'check_id';
    case 'deposit': return 'deposit_id';
    case 'credit_card': return 'credit_card_id';
    case 'manual': return 'journal_entry_id';
    case 'bill_payment': return 'journal_entry_id';
    case 'consolidated_bill_payment': return 'journal_entry_id';
    default: return null;
  }
}
