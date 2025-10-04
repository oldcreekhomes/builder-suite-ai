import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { CalendarIcon, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface JournalLine {
  id: string;
  account_id: string;
  debit: string;
  credit: string;
  memo: string;
}

interface JournalEntryFormProps {
  projectId?: string;
}

export const JournalEntryForm = ({ projectId }: JournalEntryFormProps) => {
  const { createManualJournalEntry } = useJournalEntries();
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
    { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
  ]);

  const totals = useMemo(() => {
    const totalDebits = lines.reduce((sum, line) => {
      const debit = parseFloat(line.debit) || 0;
      return sum + debit;
    }, 0);

    const totalCredits = lines.reduce((sum, line) => {
      const credit = parseFloat(line.credit) || 0;
      return sum + credit;
    }, 0);

    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01 && totalDebits > 0 && totalCredits > 0;

    return { totalDebits, totalCredits, difference, isBalanced };
  }, [lines]);

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        
        // If updating debit, clear credit and vice versa
        if (field === "debit" && value) {
          updated.credit = "";
        } else if (field === "credit" && value) {
          updated.debit = "";
        }
        
        return updated;
      }
      return line;
    }));
  };

  const handleSubmit = async () => {
    const journalLines = lines
      .filter(line => line.account_id && (line.debit || line.credit))
      .map(line => ({
        account_id: line.account_id,
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        memo: line.memo || undefined,
        project_id: projectId,
      }));

    await createManualJournalEntry.mutateAsync({
      entry_date: entryDate,
      description: description || undefined,
      lines: journalLines,
      project_id: projectId,
    });

    // Reset form
    setEntryDate(new Date());
    setDescription("");
    setLines([
      { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
      { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
    ]);
  };

  const isValid = totals.isBalanced && lines.some(line => line.account_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Journal Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Entry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !entryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(entryDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={entryDate}
                  onSelect={(date) => date && setEntryDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Entry description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Line Items</Label>
            <Button onClick={addLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Account</th>
                    <th className="text-right p-3 font-medium w-32">Debit</th>
                    <th className="text-right p-3 font-medium w-32">Credit</th>
                    <th className="text-left p-3 font-medium">Memo</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="p-3">
                        <AccountSearchInput
                          value={line.account_id}
                          onChange={(value) => updateLine(line.id, "account_id", value)}
                          placeholder="Select account"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                          className="text-right"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                          className="text-right"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          placeholder="Line memo (optional)"
                          value={line.memo}
                          onChange={(e) => updateLine(line.id, "memo", e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        {lines.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-muted/50">
                  <tr>
                    <td className="p-3 font-semibold">Totals</td>
                    <td className="p-3 text-right font-semibold">
                      ${totals.totalDebits.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      ${totals.totalCredits.toFixed(2)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Balance Indicator */}
          <div className="flex items-center gap-2 p-4 rounded-lg border">
            {totals.isBalanced ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Entry is balanced</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Entry must balance. Difference: ${Math.abs(totals.difference).toFixed(2)}
                  {totals.difference > 0 ? " (Debits exceed Credits)" : " (Credits exceed Debits)"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setEntryDate(new Date());
              setDescription("");
              setLines([
                { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
                { id: crypto.randomUUID(), account_id: "", debit: "", credit: "", memo: "" },
              ]);
            }}
          >
            Clear
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createManualJournalEntry.isPending}
          >
            {createManualJournalEntry.isPending ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
