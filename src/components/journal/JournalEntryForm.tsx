import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { CalendarIcon, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface JournalLine {
  id: string;
  line_type: 'expense' | 'job_cost';
  account_id?: string;
  cost_code_id?: string;
  cost_code_display?: string; // For displaying the formatted cost code text
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
  const [activeTab, setActiveTab] = useState<'job_cost' | 'expense'>('job_cost');
  const [expenseLines, setExpenseLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), line_type: 'expense', account_id: "", debit: "", credit: "", memo: "" },
  ]);
  const [jobCostLines, setJobCostLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", debit: "", credit: "", memo: "" },
  ]);

  const totals = useMemo(() => {
    const allLines = [...expenseLines, ...jobCostLines];
    const totalDebits = allLines.reduce((sum, line) => {
      const debit = parseFloat(line.debit) || 0;
      return sum + debit;
    }, 0);

    const totalCredits = allLines.reduce((sum, line) => {
      const credit = parseFloat(line.credit) || 0;
      return sum + credit;
    }, 0);

    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01 && totalDebits > 0 && totalCredits > 0;

    return { totalDebits, totalCredits, difference, isBalanced };
  }, [expenseLines, jobCostLines]);

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, { 
      id: crypto.randomUUID(), 
      line_type: 'expense',
      account_id: "", 
      debit: "", 
      credit: "", 
      memo: "" 
    }]);
  };

  const addJobCostLine = () => {
    setJobCostLines([...jobCostLines, { 
      id: crypto.randomUUID(), 
      line_type: 'job_cost',
      cost_code_id: "",
      cost_code_display: "",
      debit: "", 
      credit: "", 
      memo: "" 
    }]);
  };

  const removeExpenseLine = (id: string) => {
    if (expenseLines.length > 1) {
      setExpenseLines(expenseLines.filter(line => line.id !== id));
    }
  };

  const removeJobCostLine = (id: string) => {
    if (jobCostLines.length > 1) {
      setJobCostLines(jobCostLines.filter(line => line.id !== id));
    }
  };

  const updateExpenseLine = (id: string, field: keyof JournalLine, value: string) => {
    setExpenseLines(expenseLines.map(line => {
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

  const updateJobCostLine = (id: string, field: keyof JournalLine, value: string) => {
    setJobCostLines(jobCostLines.map(line => {
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
    const allLines = [...expenseLines, ...jobCostLines];
    const journalLines = allLines
      .filter(line => {
        if (line.line_type === 'expense') {
          return line.account_id && (line.debit || line.credit);
        } else {
          return line.cost_code_id && (line.debit || line.credit);
        }
      })
      .map((line, index) => ({
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.line_type === 'expense' ? line.account_id : undefined,
        project_id: line.line_type === 'job_cost' ? projectId : undefined,
        cost_code_id: line.line_type === 'job_cost' ? line.cost_code_id : undefined,
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        memo: line.memo || undefined,
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
    setExpenseLines([{ id: crypto.randomUUID(), line_type: 'expense', account_id: "", debit: "", credit: "", memo: "" }]);
    setJobCostLines([{ id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", cost_code_display: "", debit: "", credit: "", memo: "" }]);
  };

  const isValid = totals.isBalanced;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Header Section - Consolidated */}
        <div className="grid grid-cols-2 gap-4">
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
            <Input
              placeholder="Entry description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Tabbed Line Items */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'job_cost' | 'expense')}>
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="job_cost">Job Cost</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
              </TabsList>
              <Button 
                onClick={activeTab === 'job_cost' ? addJobCostLine : addExpenseLine} 
                size="sm" 
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            {/* Job Cost Tab */}
            <TabsContent value="job_cost" className="space-y-4 mt-4">

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium" style={{ width: '400px' }}>Cost Code</th>
                        <th className="text-left p-3 font-medium" style={{ width: '120px' }}>Debit</th>
                        <th className="text-left p-3 font-medium" style={{ width: '120px' }}>Credit</th>
                        <th className="text-left p-3 font-medium">Memo</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobCostLines.map((line, index) => (
                        <tr key={line.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="p-3">
                            <CostCodeSearchInput
                              value={line.cost_code_display || ""}
                              onChange={(value) => updateJobCostLine(line.id, "cost_code_display", value)}
                              onCostCodeSelect={(costCode) => {
                                updateJobCostLine(line.id, "cost_code_id", costCode.id);
                                updateJobCostLine(line.id, "cost_code_display", `${costCode.code} - ${costCode.name}`);
                              }}
                              placeholder="Select cost code"
                              className="w-full"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={line.debit}
                              onChange={(e) => updateJobCostLine(line.id, "debit", e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={line.credit}
                              onChange={(e) => updateJobCostLine(line.id, "credit", e.target.value)}
                            />
                          </td>
                          <td className="p-3 pr-0">
                            <Input
                              placeholder="Line memo (optional)"
                              value={line.memo}
                              onChange={(e) => updateJobCostLine(line.id, "memo", e.target.value)}
                            />
                          </td>
                          <td className="py-3 pl-2 pr-3">
                            {jobCostLines.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeJobCostLine(line.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Expense Tab */}
            <TabsContent value="expense" className="space-y-4 mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium" style={{ width: '400px' }}>Account</th>
                        <th className="text-left p-3 font-medium" style={{ width: '120px' }}>Debit</th>
                        <th className="text-left p-3 font-medium" style={{ width: '120px' }}>Credit</th>
                        <th className="text-left p-3 font-medium">Memo</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseLines.map((line, index) => (
                        <tr key={line.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="p-3">
                            <AccountSearchInput
                              value={line.account_id || ""}
                              onChange={(value) => updateExpenseLine(line.id, "account_id", value)}
                              placeholder="Select account"
                              className="w-full"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={line.debit}
                              onChange={(e) => updateExpenseLine(line.id, "debit", e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={line.credit}
                              onChange={(e) => updateExpenseLine(line.id, "credit", e.target.value)}
                            />
                          </td>
                          <td className="p-3 pr-0">
                            <Input
                              placeholder="Line memo (optional)"
                              value={line.memo}
                              onChange={(e) => updateExpenseLine(line.id, "memo", e.target.value)}
                            />
                          </td>
                          <td className="py-3 pl-2 pr-3">
                            {expenseLines.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExpenseLine(line.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Combined Totals */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <tfoot className="border-t-2 bg-muted/50">
                <tr>
                  <td className="p-3 font-semibold">Totals</td>
                  <td className="p-3 text-right font-semibold">
                    ${totals.totalDebits.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ${totals.totalCredits.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
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
              setExpenseLines([{ id: crypto.randomUUID(), line_type: 'expense', account_id: "", debit: "", credit: "", memo: "" }]);
              setJobCostLines([{ id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", cost_code_display: "", debit: "", credit: "", memo: "" }]);
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
