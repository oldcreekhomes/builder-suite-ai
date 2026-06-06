import { useEffect, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Calendar } from "lucide-react";
import {
  appendBillNote,
  formatBillNote,
  parseBillNotes,
} from "@/lib/billNoteUtils";

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
  const [newEntry, setNewEntry] = useState("");
  const [existingMemo, setExistingMemo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load the full existing memo (including any history) when dialog opens
  useEffect(() => {
    if (!open) {
      setNewEntry("");
      setExistingMemo("");
      return;
    }

    const loadMemo = async () => {
      try {
        if (sourceType === "consolidated_bill_payment") {
          const { data } = await supabase
            .from("bill_payments")
            .select("memo")
            .eq("id", sourceId)
            .maybeSingle();
          setExistingMemo((data?.memo as string | null) || currentDescription || "");
          return;
        }

        const lineTable = getLineTable(sourceType);
        const parentColumn = getParentColumn(sourceType);
        if (lineTable && parentColumn) {
          const parentId = sourceType === "manual" ? journalEntryId : sourceId;
          const { data } = await supabase
            .from(lineTable as any)
            .select("memo, line_number")
            .eq(parentColumn, parentId)
            .order("line_number", { ascending: true })
            .limit(1);
          const row = (data && data[0]) as unknown as { memo: string | null } | undefined;
          setExistingMemo(row?.memo || currentDescription || "");
        } else {
          setExistingMemo(currentDescription || "");
        }
      } catch (err) {
        console.error("Error loading existing description:", err);
        setExistingMemo(currentDescription || "");
      }
    };

    loadMemo();
  }, [open, sourceType, sourceId, journalEntryId, currentDescription]);

  const parsedHistory = parseBillNotes(existingMemo);

  const handleSave = async () => {
    const trimmed = newEntry.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const isConsolidated = sourceType === "consolidated_bill_payment";
      const isSyntheticJe = !journalEntryId || journalEntryId.startsWith("consolidated:");

      // Resolve current user's display name for attribution
      let userName = "Unknown User";
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        const { data: userRow } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        if (userRow) {
          userName =
            `${(userRow as any).first_name || ""} ${(userRow as any).last_name || ""}`.trim() ||
            user.email ||
            "Unknown User";
        } else if (user.email) {
          userName = user.email;
        }
      }

      const formatted = formatBillNote(userName, trimmed);
      const finalMemo = appendBillNote(existingMemo, formatted);

      // Write the full history string to the underlying source field
      if (isConsolidated) {
        await supabase.from("bill_payments").update({ memo: finalMemo }).eq("id", sourceId);
      } else if (sourceType === "bill_payment") {
        const { data: lines } = await supabase
          .from("bill_lines")
          .select("id, line_number")
          .eq("bill_id", sourceId)
          .order("line_number", { ascending: true })
          .limit(1);
        if (lines && lines.length > 0) {
          await supabase
            .from("bill_lines")
            .update({ memo: finalMemo })
            .eq("id", (lines[0] as any).id);
        }
      } else {
        const lineTable = getLineTable(sourceType);
        const parentColumn = getParentColumn(sourceType);
        if (lineTable && parentColumn) {
          const parentId = sourceType === "manual" ? journalEntryId : sourceId;
          const { data: lines } = await supabase
            .from(lineTable as any)
            .select("id, line_number")
            .eq(parentColumn, parentId)
            .order("line_number", { ascending: true })
            .limit(1);
          if (lines && lines.length > 0) {
            await supabase
              .from(lineTable as any)
              .update({ memo: finalMemo } as any)
              .eq("id", (lines[0] as any).id);
          }
        }
      }

      // Keep GL ledger memos in sync with just the latest entry content (no history clutter)
      if (!isSyntheticJe) {
        const { data: jeLines } = await supabase
          .from("journal_entry_lines")
          .select("id")
          .eq("journal_entry_id", journalEntryId)
          .limit(1);
        if (jeLines && jeLines.length > 0) {
          await supabase
            .from("journal_entry_lines")
            .update({ memo: trimmed })
            .eq("journal_entry_id", journalEntryId);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      if (isConsolidated || sourceType === "bill_payment") {
        await queryClient.invalidateQueries({ queryKey: ["bill-payments-reconciliation"] });
      }

      toast({
        title: "Description Updated",
        description: "The transaction description has been updated.",
      });
      onSaved?.(trimmed);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating description:", error);
      toast({
        title: "Error",
        description: "Failed to update description.",
        variant: "destructive",
      });
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

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">New description</label>
            <Textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="Enter description..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !newEntry.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>

        {parsedHistory.length > 0 && (
          <div className="border-t pt-3">
            <label className="text-sm font-medium mb-2 block text-muted-foreground">
              Previous descriptions
            </label>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {parsedHistory.map((note, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 rounded-md p-3 text-sm border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {note.userName || "Unknown User"}
                        </span>
                      </div>
                      {note.date ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{note.date}</span>
                        </div>
                      ) : note.isLegacy ? (
                        <span className="text-xs text-muted-foreground italic">(no date)</span>
                      ) : null}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getLineTable(sourceType: string): string | null {
  switch (sourceType) {
    case "bill":
      return "bill_lines";
    case "check":
      return "check_lines";
    case "deposit":
      return "deposit_lines";
    case "credit_card":
      return "credit_card_lines";
    case "manual":
      return "journal_entry_lines";
    case "bill_payment":
      return "journal_entry_lines";
    case "consolidated_bill_payment":
      return "journal_entry_lines";
    default:
      return null;
  }
}

function getParentColumn(sourceType: string): string | null {
  switch (sourceType) {
    case "bill":
      return "bill_id";
    case "check":
      return "check_id";
    case "deposit":
      return "deposit_id";
    case "credit_card":
      return "credit_card_id";
    case "manual":
      return "journal_entry_id";
    case "bill_payment":
      return "journal_entry_id";
    case "consolidated_bill_payment":
      return "journal_entry_id";
    default:
      return null;
  }
}
