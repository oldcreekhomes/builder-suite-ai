import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { useRecurringTransactions, type CreateRecurringTransactionInput, type RecurringTransactionLine } from "@/hooks/useRecurringTransactions";
import { format, addMonths } from "date-fns";

interface MemorizeTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "check" | "credit_card" | "bill";
  templateData: Record<string, any>;
  lines: RecurringTransactionLine[];
  defaultName?: string;
}

export function MemorizeTransactionDialog({
  open,
  onOpenChange,
  transactionType,
  templateData,
  lines,
  defaultName = "",
}: MemorizeTransactionDialogProps) {
  const { createRecurring } = useRecurringTransactions();
  const [name, setName] = useState(defaultName);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly" | "annually">("monthly");
  const [nextDate, setNextDate] = useState<Date>(addMonths(new Date(), 1));
  const [autoEnter, setAutoEnter] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    const input: CreateRecurringTransactionInput = {
      name: name.trim(),
      transaction_type: transactionType,
      frequency,
      next_date: format(nextDate, "yyyy-MM-dd"),
      auto_enter: autoEnter,
      template_data: templateData,
      lines,
    };

    await createRecurring.mutateAsync(input);
    onOpenChange(false);
  };

  const typeLabel = transactionType === "check" ? "Check" : transactionType === "credit_card" ? "Credit Card Charge" : "Bill";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Memorize {typeLabel}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. OST Consulting - Monthly"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Next Date</Label>
            <DateInputPicker
              date={nextDate}
              onDateChange={(d) => setNextDate(d)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-enter">Auto-enter (skip verification)</Label>
            <Switch
              id="auto-enter"
              checked={autoEnter}
              onCheckedChange={setAutoEnter}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || createRecurring.isPending}>
            {createRecurring.isPending ? "Saving..." : "Memorize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
