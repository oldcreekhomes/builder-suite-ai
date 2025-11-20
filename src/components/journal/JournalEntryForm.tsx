import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { CalendarIcon, Plus, Trash2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toDateLocal } from "@/utils/dateOnly";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { JournalEntryAttachmentUpload, JournalEntryAttachment } from "@/components/journal/JournalEntryAttachmentUpload";
import { supabase } from "@/integrations/supabase/client";

interface JournalLine {
  id: string;
  line_type: 'expense' | 'job_cost';
  account_id?: string;
  account_display?: string; // For displaying the formatted account text
  cost_code_id?: string;
  cost_code_display?: string; // For displaying the formatted cost code text
  debit: string;
  credit: string;
  memo: string;
}

interface JournalEntryFormProps {
  projectId?: string;
  activeTab?: string;
}

export const JournalEntryForm = ({ projectId, activeTab: parentActiveTab }: JournalEntryFormProps) => {
  const { createManualJournalEntry, updateManualJournalEntry, deleteManualJournalEntry, journalEntries, isLoading } = useJournalEntries();
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<'job_cost' | 'expense'>('job_cost');
  const [expenseLines, setExpenseLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), line_type: 'expense', account_id: "", account_display: "", debit: "", credit: "", memo: "" },
  ]);
  const [jobCostLines, setJobCostLines] = useState<JournalLine[]>([
    { id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", debit: "", credit: "", memo: "" },
  ]);
  const [currentEntryIndex, setCurrentEntryIndex] = useState<number>(-1); // -1 means new entry
  const [isViewingMode, setIsViewingMode] = useState(false);
  const [viewedEntryId, setViewedEntryId] = useState<string | null>(null);
  const [currentJournalEntryId, setCurrentJournalEntryId] = useState<string | null>(null);
  
  // Attachments - local state management like Bills
  const [attachments, setAttachments] = useState<JournalEntryAttachment[]>([]);

  // Filter entries by projectId if specified
  const filteredEntries = useMemo(() => {
    if (!projectId) {
      return journalEntries;
    }
    return journalEntries.filter(entry => 
      entry.lines?.some((line: any) => line.project_id === projectId)
    );
  }, [journalEntries, projectId]);

  console.debug('Journal Entry Navigation State:', {
    projectId,
    totalEntries: journalEntries.length,
    filteredEntries: filteredEntries.length,
    currentEntryIndex,
    isViewingMode
  });
  const hasInitializedRef = useRef(false);

  // Calculate position counter (includes "new" entry in count)
  const totalCount = isViewingMode ? filteredEntries.length : filteredEntries.length + 1;
  const currentPosition = isViewingMode ? currentEntryIndex + 1 : 1;

  // Format number with commas
  const formatNumber = (value: string | number): string => {
    if (!value) return "";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Remove commas from formatted number
  const parseFormattedNumber = (value: string): string => {
    return value.replace(/,/g, '');
  };

  // Helper to check if a line has a numeric amount
  const hasAmount = (line: JournalLine): boolean => {
    const debit = parseFloat(parseFormattedNumber(line.debit)) || 0;
    const credit = parseFloat(parseFormattedNumber(line.credit)) || 0;
    return debit > 0 || credit > 0;
  };

  // Helper to check if a line has required selection based on type
  const hasRequiredSelection = (line: JournalLine): boolean => {
    if (line.line_type === 'expense') {
      return !!line.account_id;
    } else {
      return !!line.cost_code_id;
    }
  };

  const totals = useMemo(() => {
    const allLines = [...expenseLines, ...jobCostLines];
    
    // Include ALL lines with amounts, regardless of whether they have selections
    const validLines = allLines.filter(line => hasAmount(line));
    
    const totalDebits = validLines.reduce((sum, line) => {
      const debit = parseFloat(parseFormattedNumber(line.debit)) || 0;
      return sum + debit;
    }, 0);

    const totalCredits = validLines.reduce((sum, line) => {
      const credit = parseFloat(parseFormattedNumber(line.credit)) || 0;
      return sum + credit;
    }, 0);

    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01 && totalDebits > 0 && totalCredits > 0;

    // Count lines with amounts but missing required selections
    const missingSelections = validLines.filter(line => !hasRequiredSelection(line)).length;

    console.debug('Journal Entry Totals:', {
      totalDebits,
      totalCredits,
      difference,
      isBalanced,
      missingSelections,
      validLinesCount: validLines.length
    });

    return { totalDebits, totalCredits, difference, isBalanced, missingSelections };
  }, [expenseLines, jobCostLines]);

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, { 
      id: crypto.randomUUID(), 
      line_type: 'expense',
      account_id: "",
      account_display: "",
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
    } else {
      // Reset the line to empty if it's the last one
      setExpenseLines([{ id: crypto.randomUUID(), line_type: 'expense', account_id: "", account_display: "", debit: "", credit: "", memo: "" }]);
    }
  };

  const removeJobCostLine = (id: string) => {
    if (jobCostLines.length > 1) {
      setJobCostLines(jobCostLines.filter(line => line.id !== id));
    } else {
      // Reset the line to empty if it's the last one
      setJobCostLines([{ id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", cost_code_display: "", debit: "", credit: "", memo: "" }]);
    }
  };

  const updateExpenseLine = (id: string, field: keyof JournalLine, value: string) => {
    setExpenseLines(prev => prev.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        
        // If updating debit, clear credit and vice versa
        if (field === "debit" && value) {
          updated.credit = "";
        } else if (field === "credit" && value) {
          updated.debit = "";
        }
        
        // Clear account_id when display is cleared
        if (field === "account_display" && !value) {
          updated.account_id = "";
        }
        
        return updated;
      }
      return line;
    }));
  };

  // Helper to update multiple expense line fields at once
  const updateExpenseLineFields = (id: string, updates: Partial<JournalLine>) => {
    setExpenseLines(prev => prev.map(line => 
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  const updateJobCostLine = (id: string, field: keyof JournalLine, value: string) => {
    setJobCostLines(prev => prev.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        
        // If updating debit, clear credit and vice versa
        if (field === "debit" && value) {
          updated.credit = "";
        } else if (field === "credit" && value) {
          updated.debit = "";
        }
        
        // Clear cost_code_id when display is cleared
        if (field === "cost_code_display" && !value) {
          updated.cost_code_id = "";
        }
        
        return updated;
      }
      return line;
    }));
  };

  // Helper to update multiple fields at once
  const updateJobCostLineFields = (id: string, updates: Partial<JournalLine>) => {
    setJobCostLines(prev => prev.map(line => 
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  // Load attachments for a journal entry
  const loadAttachments = async (entryId: string) => {
    const { data, error } = await supabase
      .from('journal_entry_attachments')
      .select('*')
      .eq('journal_entry_id', entryId);
    
    if (!error && data) {
      setAttachments(data.map(att => ({
        id: att.id,
        file_name: att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        content_type: att.content_type || ''
      })));
    } else {
      setAttachments([]);
    }
  };

  // Load a journal entry into the form
  const loadJournalEntry = (entry: any) => {
    setCurrentJournalEntryId(entry.id);
    setEntryDate(toDateLocal(entry.entry_date));
    setDescription(entry.description || "");
    loadAttachments(entry.id);
    
    const expLines: JournalLine[] = [];
    const jobLines: JournalLine[] = [];
    
    entry.lines?.forEach((line: any) => {
      const formattedLine = {
        id: crypto.randomUUID(),
        line_type: line.cost_code_id ? 'job_cost' : 'expense' as 'expense' | 'job_cost',
        account_id: line.account_id || "",
        account_display: line.accounts ? `${line.accounts.code} - ${line.accounts.name}` : "",
        cost_code_id: line.cost_code_id || "",
        cost_code_display: line.cost_codes ? `${line.cost_codes.code} - ${line.cost_codes.name}` : "",
        debit: line.debit?.toString() || "",
        credit: line.credit?.toString() || "",
        memo: line.memo || "",
      };
      
      if (formattedLine.line_type === 'expense') {
        expLines.push(formattedLine);
      } else {
        jobLines.push(formattedLine);
      }
    });
    
    setExpenseLines(expLines.length > 0 ? expLines : [
      { id: crypto.randomUUID(), line_type: 'expense', account_id: "", account_display: "", debit: "", credit: "", memo: "" }
    ]);
    setJobCostLines(jobLines.length > 0 ? jobLines : [
      { id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", cost_code_display: "", debit: "", credit: "", memo: "" }
    ]);
    
    setIsViewingMode(true);
  };

  // Navigation handlers
  const goToPrevious = () => {
    // Navigate to older entries (right arrow)
    if (currentEntryIndex === -1 && filteredEntries.length > 0) {
      // From "New" state, load the most recent entry
      console.debug('Loading most recent entry from New state');
      setCurrentEntryIndex(0);
      loadJournalEntry(filteredEntries[0]);
    } else if (currentEntryIndex < filteredEntries.length - 1) {
      const newIndex = currentEntryIndex + 1;
      console.debug('Navigating to older entry:', newIndex);
      setCurrentEntryIndex(newIndex);
      loadJournalEntry(filteredEntries[newIndex]);
    }
  };

  const goToNext = () => {
    // Navigate to newer entries (left arrow)
    if (currentEntryIndex > 0) {
      const newIndex = currentEntryIndex - 1;
      console.debug('Navigating to newer entry:', newIndex);
      setCurrentEntryIndex(newIndex);
      loadJournalEntry(filteredEntries[newIndex]);
    }
  };

  const createNewEntry = () => {
    setCurrentEntryIndex(-1);
    setCurrentJournalEntryId(null);
    setIsViewingMode(false);
    setEntryDate(new Date());
    setDescription("");
    setAttachments([]);
    setExpenseLines([{ id: crypto.randomUUID(), line_type: 'expense', account_id: "", account_display: "", debit: "", credit: "", memo: "" }]);
    setJobCostLines([{ id: crypto.randomUUID(), line_type: 'job_cost', cost_code_id: "", cost_code_display: "", debit: "", credit: "", memo: "" }]);
  };

  // Initialize only once: load most recent entry on first mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!isLoading) {
      if (filteredEntries.length > 0) {
        console.debug('Initial load: loading most recent entry');
        setCurrentEntryIndex(0);
        loadJournalEntry(filteredEntries[0]);
      }
      hasInitializedRef.current = true;
    }
  }, [isLoading, filteredEntries.length]);

  // Keep currently viewed entry in sync by id without breaking "New" state
  useEffect(() => {
    if (isLoading) return;
    if (!isViewingMode) return;
    if (!currentJournalEntryId) return;

    const idx = filteredEntries.findIndex((e: any) => e.id === currentJournalEntryId);
    if (idx !== -1 && idx !== currentEntryIndex) {
      console.debug('Syncing viewed entry to index:', idx);
      setCurrentEntryIndex(idx);
      loadJournalEntry(filteredEntries[idx]);
    }
  }, [filteredEntries, isLoading, isViewingMode, currentJournalEntryId, currentEntryIndex]);

  // Reset to "new" mode when journal-entry tab becomes active
  useEffect(() => {
    if (parentActiveTab === 'journal-entry') {
      console.debug('Journal Entry tab activated, resetting to new entry mode');
      createNewEntry();
    }
  }, [parentActiveTab]);

  const handleDelete = async () => {
    if (!currentJournalEntryId) return;
    
    await deleteManualJournalEntry.mutateAsync(currentJournalEntryId);
    
    // After successful deletion, reset to new entry mode
    createNewEntry();
  };

  const handleSubmit = async () => {
    // Check for missing selections before submitting (safety check, button should be disabled)
    if (totals.missingSelections > 0) {
      console.warn('Cannot submit: Missing selections for lines with amounts');
      return;
    }

    const allLines = [...expenseLines, ...jobCostLines];
    const journalLines = allLines
      .filter(line => hasAmount(line) && hasRequiredSelection(line))
      .map((line, index) => ({
        line_number: index + 1,
        line_type: line.line_type,
        account_id: line.line_type === 'expense' ? line.account_id : undefined,
        project_id: projectId || undefined,
        cost_code_id: line.line_type === 'job_cost' ? line.cost_code_id : undefined,
        debit: parseFloat(parseFormattedNumber(line.debit)) || 0,
        credit: parseFloat(parseFormattedNumber(line.credit)) || 0,
        memo: line.memo || undefined,
      }));

    console.debug('Submitting journal entry with lines:', journalLines);

    if (currentJournalEntryId) {
      // Updating existing entry
      await updateManualJournalEntry.mutateAsync({
        journal_entry_id: currentJournalEntryId,
        entry_date: entryDate,
        description: description || undefined,
        lines: journalLines,
        project_id: projectId,
      });
      // After save, clear form and prepare for next entry
      createNewEntry();
    } else {
      // Creating new entry
      const newEntry = await createManualJournalEntry.mutateAsync({
        entry_date: entryDate,
        description: description || undefined,
        lines: journalLines,
        project_id: projectId,
      });

      // Upload temp attachments if any
      if (newEntry?.id) {
        const tempAttachments = attachments.filter(att => !att.id && att.file);
        for (const tempAtt of tempAttachments) {
          if (tempAtt.file) {
            const timestamp = Date.now();
            const sanitizedName = tempAtt.file.name
              .replace(/\s+/g, '_')
              .replace(/[^\w.-]/g, '_')
              .replace(/_+/g, '_');
            const fileName = `${timestamp}_${sanitizedName}`;
            const filePath = `journal-entry-attachments/${newEntry.id}/${fileName}`;

            await supabase.storage.from('project-files').upload(filePath, tempAtt.file);
            await supabase.from('journal_entry_attachments').insert({
              journal_entry_id: newEntry.id,
              file_name: tempAtt.file.name,
              file_path: filePath,
              file_size: tempAtt.file.size,
              content_type: tempAtt.content_type,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id
            });
          }
        }
      }
      // After save, clear form and prepare for next entry
      createNewEntry();
    }
  };

  const isValid = totals.isBalanced && totals.missingSelections === 0;

  return (
    <TooltipProvider>
      <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Row 1: Entry Date, Description, Attachments, and Navigation Controls */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Entry Date */}
          <div className="space-y-2" style={{ minWidth: '200px' }}>
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
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={entryDate}
                  onSelect={(date) => date && setEntryDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2 flex-1" style={{ minWidth: '250px' }}>
            <Label>Description</Label>
            <Input
              placeholder="Entry description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Attachments - Inline */}
          <div className="space-y-2" style={{ minWidth: '140px' }}>
            <Label>Attachments</Label>
            <JournalEntryAttachmentUpload
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              journalEntryId={currentJournalEntryId || undefined}
            />
          </div>

          {/* New Entry Button */}
          <Button
            onClick={createNewEntry}
            size="sm"
            variant={!isViewingMode ? "default" : "outline"}
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={(currentEntryIndex >= filteredEntries.length - 1 && currentEntryIndex !== -1) || filteredEntries.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Older entry</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentEntryIndex <= 0 || filteredEntries.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Newer entry</p>
              </TooltipContent>
            </Tooltip>
            {currentJournalEntryId && isViewingMode && !isDateLocked(entryDate.toISOString().split('T')[0]) ? (
              <DeleteButton
                onDelete={handleDelete}
                title="Delete Journal Entry"
                description={`Are you sure you want to delete this journal entry${description ? ` "${description}"` : ''}? This will permanently delete the entry and all associated lines. This action cannot be undone.`}
                size="sm"
                variant="ghost"
                isLoading={deleteManualJournalEntry.isPending}
              />
            ) : currentJournalEntryId && isViewingMode && isDateLocked(entryDate.toISOString().split('T')[0]) ? (
              <Button
                size="sm"
                variant="ghost"
                disabled
              >
                <span className="text-lg">🔒</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Job Cost/Expense Tabs with Add Line Button */}
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
                                updateJobCostLineFields(line.id, {
                                  cost_code_id: costCode.id,
                                  cost_code_display: `${costCode.code} - ${costCode.name}`
                                });
                                console.debug('Cost code selected:', { id: costCode.id, display: `${costCode.code} - ${costCode.name}` });
                              }}
                              placeholder="Select cost code"
                              className="w-full"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={line.debit || ""}
                              onChange={(e) => {
                                const value = parseFormattedNumber(e.target.value);
                                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                                  updateJobCostLine(line.id, "debit", value);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value && !isNaN(parseFloat(parseFormattedNumber(e.target.value)))) {
                                  updateJobCostLine(line.id, "debit", parseFormattedNumber(e.target.value));
                                }
                              }}
                              className="text-right"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={line.credit || ""}
                              onChange={(e) => {
                                const value = parseFormattedNumber(e.target.value);
                                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                                  updateJobCostLine(line.id, "credit", value);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value && !isNaN(parseFloat(parseFormattedNumber(e.target.value)))) {
                                  updateJobCostLine(line.id, "credit", parseFormattedNumber(e.target.value));
                                }
                              }}
                              className="text-right"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeJobCostLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                              value={line.account_display || ""}
                              onChange={(value) => updateExpenseLine(line.id, "account_display", value)}
                              onAccountSelect={(account) => {
                                updateExpenseLineFields(line.id, {
                                  account_id: account.id,
                                  account_display: `${account.code} - ${account.name}`
                                });
                                console.debug('Account selected:', { id: account.id, display: `${account.code} - ${account.name}` });
                              }}
                              placeholder="Select account"
                              className="w-full"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={line.debit || ""}
                              onChange={(e) => {
                                const value = parseFormattedNumber(e.target.value);
                                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                                  updateExpenseLine(line.id, "debit", value);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value && !isNaN(parseFloat(parseFormattedNumber(e.target.value)))) {
                                  updateExpenseLine(line.id, "debit", parseFormattedNumber(e.target.value));
                                }
                              }}
                              className="text-right"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={line.credit || ""}
                              onChange={(e) => {
                                const value = parseFormattedNumber(e.target.value);
                                if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                                  updateExpenseLine(line.id, "credit", value);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value && !isNaN(parseFloat(parseFormattedNumber(e.target.value)))) {
                                  updateExpenseLine(line.id, "credit", parseFormattedNumber(e.target.value));
                                }
                              }}
                              className="text-right"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExpenseLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                  <td className="p-3 font-semibold" style={{ width: '400px' }}>Totals</td>
                  <td className="p-3 text-left font-semibold" style={{ width: '120px' }}>
                    ${formatNumber(totals.totalDebits)}
                  </td>
                  <td className="p-3 text-left font-semibold" style={{ width: '120px' }}>
                    ${formatNumber(totals.totalCredits)}
                  </td>
                  <td className="p-3"></td>
                  <td className="w-12"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance Indicator */}
          <div className="flex items-center gap-2 p-4 rounded-lg border">
            {totals.isBalanced && totals.missingSelections === 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Entry is balanced and ready to save</span>
              </>
            ) : totals.missingSelections > 0 ? (
              <>
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-600 font-medium">
                  Please select {activeTab === 'job_cost' ? 'cost code' : 'account'}{totals.missingSelections > 1 ? 's' : ''} for {totals.missingSelections} line{totals.missingSelections > 1 ? 's' : ''} with amounts
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Entry must balance. Difference: ${formatNumber(Math.abs(totals.difference))}
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
            onClick={createNewEntry}
          >
            Clear
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createManualJournalEntry.isPending || updateManualJournalEntry.isPending}
          >
            {createManualJournalEntry.isPending || updateManualJournalEntry.isPending ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};
