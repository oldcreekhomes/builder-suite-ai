import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillsApprovalTable } from "./BillsApprovalTable";
import { PayBillsTable } from "./PayBillsTable";
import SimplifiedAIBillExtraction from "./SimplifiedAIBillExtraction";
import { BatchBillReviewTable } from "./BatchBillReviewTable";
import { ManualBillEntry } from "./ManualBillEntry";
import { LotAllocationDialog, type LotAllocation } from "./LotAllocationDialog";
import { usePendingBills, type PendingBill, type PendingBillLine } from "@/hooks/usePendingBills";
import { useReferenceNumberValidation } from "@/hooks/useReferenceNumberValidation";
import { useBillCounts } from "@/hooks/useBillCounts";
import { useLots } from "@/hooks/useLots";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface BillsApprovalTabsProps {
  projectId?: string;
  projectIds?: string[];
  reviewOnly?: boolean;
}

interface BatchBill extends PendingBill {
  vendor_name?: string;
  bill_date?: string;
  due_date?: string;
  reference_number?: string;
  lines: PendingBillLine[];
}

export function BillsApprovalTabs({ projectId, projectIds, reviewOnly = false }: BillsApprovalTabsProps) {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || (reviewOnly ? "review" : "upload");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "due-on-or-before">("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkDuplicate } = useReferenceNumberValidation();
  const effectiveProjectId = projectId || (projectIds && projectIds.length === 1 ? projectIds[0] : undefined);
  
  // Fetch lots for the project to enable auto-population when only one lot exists
  const { lots } = useLots(effectiveProjectId);
  
  const { data: counts, isLoading: countsLoading } = useBillCounts(effectiveProjectId, projectIds);
  
  const {
    pendingBills,
    isLoading: pendingLoading,
    refetch: refetchPendingBills,
    deletePendingUpload,
    batchApproveBills,
  } = usePendingBills();

  const [batchBills, setBatchBills] = useState<BatchBill[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingCount, setExtractingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  
  // Multi-lot allocation dialog state
  const [showLotAllocationDialog, setShowLotAllocationDialog] = useState(false);
  const [pendingAllocationData, setPendingAllocationData] = useState<{
    bills: BatchBill[];
    totalAmount: number;
  } | null>(null);
  const [shouldContinueSubmit, setShouldContinueSubmit] = useState(false);
  // Fetch and sync pending bills with their lines, auto-populate lot if only one exists
  useEffect(() => {
    if (!pendingBills || pendingBills.length === 0) {
      setBatchBills([]);
      setSelectedBillIds(new Set());
      return;
    }

    // Create an abortable async effect
    let cancelled = false;
    
    const fetchAllLines = async () => {
      const billsWithLines = await Promise.all(
        pendingBills.map(async (bill) => {
          if (cancelled) return { ...bill, lines: [] };
          
          const { data: lines, error } = await supabase
            .from('pending_bill_lines')
            .select('*')
            .eq('pending_upload_id', bill.id)
            .order('line_number');

          if (error) {
            console.error(`Error fetching lines for bill ${bill.id}:`, error);
            return { ...bill, lines: [] };
          }

          let processedLines = (lines || []) as PendingBillLine[];
          
          // Auto-populate lot_id if exactly one lot exists and line doesn't have lot assigned
          if (lots.length === 1) {
            const singleLot = lots[0];
            const linesToUpdate = processedLines.filter(l => !l.lot_id);
            
            // Update lines in database if they don't have lot_id
            if (linesToUpdate.length > 0 && !cancelled) {
              const lineIds = linesToUpdate.map(l => l.id);
              await supabase
                .from('pending_bill_lines')
                .update({ lot_id: singleLot.id })
                .in('id', lineIds);
            }
            
            // Update local lines with lot info
            processedLines = processedLines.map(line => ({
              ...line,
              lot_id: line.lot_id || singleLot.id,
              lot_name: (line as any).lot_name || singleLot.lot_name || `Lot ${singleLot.lot_number}`,
            }));
          }

          return { ...bill, lines: processedLines };
        })
      );

      // Only update state if not cancelled
      if (!cancelled) {
        setBatchBills(billsWithLines);
        setSelectedBillIds(new Set(billsWithLines.map(b => b.id)));
      }
    };

    fetchAllLines();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [pendingBills, lots]);

  const handleExtractionStart = useCallback(() => {
    setIsExtracting(true);
  }, []);

  const handleExtractionComplete = useCallback(async () => {
    setIsExtracting(false);
    setExtractingCount(0);
    // Refetch pending bills after extraction completes
    await refetchPendingBills();
  }, [refetchPendingBills]);

  const handleExtractionProgress = (remaining: number) => {
    // Only update the counter - NO data refetch
    setExtractingCount(remaining);
  };

  const handleBillUpdate = useCallback((billId: string, updates: Partial<BatchBill>) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, ...updates } : bill
    ));
  }, []);

  const handleBillDelete = useCallback(async (billId: string) => {
    try {
      // Delete from DB (also cleans up related lines via RPC)
      await deletePendingUpload.mutateAsync(billId);

      // Optimistically update local UI
      setBatchBills(prev => prev.filter(bill => bill.id !== billId));
      setSelectedBillIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });

      // Ensure counters and lists are in sync immediately
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      await refetchPendingBills();
    } catch (err) {
      console.error("Failed to delete pending upload:", err);
      toast({
        title: "Error",
        description: "Failed to delete the uploaded bill. Please try again.",
        variant: "destructive",
      });
    }
  }, [deletePendingUpload, queryClient, refetchPendingBills, toast]);

  const handleLinesUpdate = useCallback((billId: string, lines: PendingBillLine[]) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, lines } : bill
    ));
  }, []);

  const handleBillSelect = useCallback((billId: string) => {
    setSelectedBillIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedBillIds(new Set(batchBills.map(b => b.id)));
    } else {
      setSelectedBillIds(new Set());
    }
  }, [batchBills]);

  // Normalize terms from any format to standardized dropdown values
  const normalizeTermsForSubmit = (terms: string | null | undefined): string => {
    if (!terms) return 'net-30';
    if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
      return terms;
    }
    const normalized = terms.toLowerCase().trim();
    if (normalized.includes('15')) return 'net-15';
    if (normalized.includes('60')) return 'net-60';
    if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
    return 'net-30';
  };

  // Compute due date from bill date and terms
  const computeDueDateFromBillDate = (billDate: string, terms: string): string => {
    const date = new Date(billDate);
    switch (terms) {
      case 'net-15': date.setDate(date.getDate() + 15); break;
      case 'net-30': date.setDate(date.getDate() + 30); break;
      case 'net-60': date.setDate(date.getDate() + 60); break;
      case 'due-on-receipt': break; // same day
      default: date.setDate(date.getDate() + 30);
    }
    return date.toISOString().split('T')[0];
  };

  const handleSubmitAllBills = useCallback(async () => {
    if (selectedBillIds.size === 0) return;
    
    setIsSubmitting(true);
    try {
      const selectedBills = batchBills.filter(bill => selectedBillIds.has(bill.id));
      
      // Validate for duplicate reference numbers before submitting
      const validatedBills: typeof selectedBills = [];
      const duplicateBills: { bill: typeof selectedBills[0]; existingVendor: string; existingProject: string }[] = [];
      
      for (const bill of selectedBills) {
        const referenceNumber = bill.extracted_data?.reference_number || 
                                bill.extracted_data?.referenceNumber || 
                                bill.reference_number;
        const billVendorId = bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
        
        // Check for duplicate reference number (per-vendor uniqueness)
        if (referenceNumber?.trim() && billVendorId) {
          const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, billVendorId);
          if (isDuplicate && existingBill) {
            duplicateBills.push({
              bill,
              existingVendor: existingBill.vendorName,
              existingProject: existingBill.projectName
            });
            continue;
          }
        }
        validatedBills.push(bill);
      }
      
      // Show warning for duplicates
      if (duplicateBills.length > 0) {
        toast({
          title: "Duplicate Invoices Skipped",
          description: `${duplicateBills.length} bill(s) skipped due to duplicate reference numbers already existing in the system`,
          variant: "destructive",
        });
      }
      
      // Validate cost codes/accounts on all selected bills
      const billsWithMissingCostCodes: { fileName: string; missingCount: number }[] = [];

      for (const bill of validatedBills) {
        let missingCount = 0;
        
        bill.lines?.forEach((line) => {
          // For job_cost lines, cost_code_id is required
          // For expense lines, account_id is required
          if (line.line_type === 'job_cost' && !line.cost_code_id) {
            missingCount++;
          } else if (line.line_type === 'expense' && !line.account_id) {
            missingCount++;
          }
        });
        
        if (missingCount > 0) {
          billsWithMissingCostCodes.push({
            fileName: bill.file_name,
            missingCount
          });
        }
      }

      if (billsWithMissingCostCodes.length > 0) {
        const billNames = billsWithMissingCostCodes
          .map(b => b.fileName)
          .slice(0, 3)
          .join(', ');
        const remaining = billsWithMissingCostCodes.length > 3 
          ? ` and ${billsWithMissingCostCodes.length - 3} more` 
          : '';
        
        toast({
          title: "Missing Cost Codes",
          description: `Cannot submit: ${billsWithMissingCostCodes.length} bill(s) are missing cost codes (${billNames}${remaining}). Please assign cost codes before submitting.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Only proceed with validated bills
      if (validatedBills.length === 0) {
        setIsSubmitting(false);
        return;
      }

      // Check if multi-lot allocation is needed (2+ lots and some lines missing lot_id)
      if (lots.length >= 2) {
        const billsWithMissingLots = validatedBills.filter(bill =>
          bill.lines?.some(line => !line.lot_id)
        );
        
        if (billsWithMissingLots.length > 0) {
          // Calculate total amount needing allocation
          const totalAmount = billsWithMissingLots.reduce((sum, bill) => {
            const lineTotal = bill.lines
              ?.filter(line => !line.lot_id)
              .reduce((lineSum, line) => lineSum + (line.amount || 0), 0) || 0;
            return sum + lineTotal;
          }, 0);
          
          // Store data and show dialog
          setPendingAllocationData({ bills: billsWithMissingLots, totalAmount });
          setShowLotAllocationDialog(true);
          setIsSubmitting(false);
          return;
        }
      }
      // Map validated bills to the format expected by batchApproveBills
      const billsToApprove = validatedBills.map(bill => {
        // Extract data from extracted_data with fallbacks to root properties
        const vendorId = bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
        const billDate = bill.extracted_data?.bill_date || bill.extracted_data?.billDate || bill.bill_date;
        const referenceNumber = bill.extracted_data?.reference_number || bill.extracted_data?.referenceNumber || bill.reference_number;
        
        // Apply same fallback logic as BatchBillReviewTable display
        const rawTerms = bill.extracted_data?.terms;
        const terms = normalizeTermsForSubmit(rawTerms);
        
        // Compute due date if missing (same logic as display)
        let dueDate = bill.extracted_data?.due_date || bill.extracted_data?.dueDate || bill.due_date;
        if (!dueDate && billDate) {
          dueDate = computeDueDateFromBillDate(billDate, terms);
        }
        
        // Determine project ID: use provided projectId, or first line's project_id if available
        const determinedProjectId = effectiveProjectId || bill.lines?.[0]?.project_id || '';
        
        if (!vendorId) {
          throw new Error(`Missing vendor for bill ${bill.id}`);
        }
        
        if (!determinedProjectId) {
          throw new Error(`Missing project for bill ${bill.id}`);
        }
        
        return {
          pendingUploadId: bill.id,
          vendorId,
          projectId: determinedProjectId,
          billDate,
          dueDate,
          referenceNumber,
          terms,
          notes: undefined,
          reviewNotes: undefined,
        };
      });

      // Call batchApproveBills which uses the approve_pending_bill RPC
      // This will properly copy line items and attachments
      const results = await batchApproveBills.mutateAsync(billsToApprove);
      
      // Check for failures
      const failures = results.filter(r => !r.success);
      const successes = results.filter(r => r.success);
      
      if (failures.length > 0) {
        console.error("Some bills failed to approve:", failures);
        toast({
          title: "Partial Success",
          description: `${successes.length} bill(s) submitted successfully, ${failures.length} failed. Check console for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${successes.length} bill${successes.length > 1 ? 's' : ''} submitted successfully`,
        });
      }

      // Clear local state
      setBatchBills([]);
      setSelectedBillIds(new Set());
      
      // Refresh data
      await refetchPendingBills();
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    } catch (error) {
      console.error("Error submitting bills:", error);
      
      // Invalidate queries even on error in case of partial success
      queryClient.invalidateQueries({ queryKey: ["bill-approval-counts"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit bills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [batchBills, selectedBillIds, effectiveProjectId, batchApproveBills, toast, refetchPendingBills, queryClient, checkDuplicate, lots]);

  // Handler for lot allocation confirmation
  const handleAllocationConfirm = useCallback(async (allocations: LotAllocation[]) => {
    const selectedAllocations = allocations.filter(a => a.selected);
    if (selectedAllocations.length === 0 || !pendingAllocationData) return;
    
    setIsSubmitting(true);
    
    try {
      // For each bill with missing lots, split lines across selected lots
      for (const bill of pendingAllocationData.bills) {
        const linesToSplit = bill.lines?.filter(line => !line.lot_id) || [];
        
        for (const line of linesToSplit) {
          const originalAmount = line.amount || 0;
          
          // Calculate proportional amounts based on allocation
          const totalAllocation = selectedAllocations.reduce((s, a) => s + a.amount, 0);
          
          // Update original line with first lot
          const firstLot = selectedAllocations[0];
          const firstLotProportion = firstLot.amount / totalAllocation;
          const firstLotAmount = Math.round(originalAmount * firstLotProportion * 100) / 100;
          
          await supabase
            .from('pending_bill_lines')
            .update({ 
              lot_id: firstLot.lotId, 
              amount: firstLotAmount,
              unit_cost: firstLotAmount
            })
            .eq('id', line.id);
          
          // Create new lines for remaining lots
          let remainingAmount = originalAmount - firstLotAmount;
          for (let i = 1; i < selectedAllocations.length; i++) {
            const lot = selectedAllocations[i];
            const isLast = i === selectedAllocations.length - 1;
            const lotProportion = lot.amount / totalAllocation;
            const lotAmount = isLast 
              ? Math.round(remainingAmount * 100) / 100  // Last lot gets remainder to avoid rounding issues
              : Math.round(originalAmount * lotProportion * 100) / 100;
            remainingAmount -= lotAmount;
            
            // Get next line number
            const { data: maxLine } = await supabase
              .from('pending_bill_lines')
              .select('line_number')
              .eq('pending_upload_id', bill.id)
              .order('line_number', { ascending: false })
              .limit(1);
            
            const nextLineNumber = (maxLine?.[0]?.line_number || 0) + 1;
            
            await supabase.from('pending_bill_lines').insert({
              pending_upload_id: bill.id,
              owner_id: line.owner_id,
              line_number: nextLineNumber,
              line_type: line.line_type,
              cost_code_id: line.cost_code_id,
              account_id: line.account_id,
              project_id: line.project_id,
              lot_id: lot.lotId,
              quantity: line.quantity,
              unit_cost: lotAmount,
              amount: lotAmount,
              memo: line.memo,
              description: line.description,
            });
          }
        }
      }
      
      toast({
        title: "Allocation Applied",
        description: `Bill amounts have been allocated across ${selectedAllocations.length} addresses.`,
      });
      
      // Refresh bills data and continue with submission
      await refetchPendingBills();
      setShowLotAllocationDialog(false);
      setPendingAllocationData(null);
      
      // Signal to continue with submission after state updates
      setShouldContinueSubmit(true);
    } catch (error) {
      console.error("Error applying allocation:", error);
      toast({
        title: "Error",
        description: "Failed to apply allocation. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }, [pendingAllocationData, refetchPendingBills, toast]);

  // Auto-continue submission after allocation is applied and batchBills updates
  useEffect(() => {
    if (shouldContinueSubmit && !showLotAllocationDialog && batchBills.length > 0) {
      setShouldContinueSubmit(false);
      // Small delay to ensure batchBills state has updated with new lot assignments
      const timer = setTimeout(() => {
        handleSubmitAllBills();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [shouldContinueSubmit, showLotAllocationDialog, batchBills, handleSubmitAllBills]);

  const handleAllocationCancel = useCallback(() => {
    setShowLotAllocationDialog(false);
    setPendingAllocationData(null);
    setIsSubmitting(false);
    setShouldContinueSubmit(false);
  }, []);

  const getTabLabel = (status: string, count: number | undefined) => {
    if (countsLoading) {
      switch (status) {
        case 'manual':
          return "Enter Manually";
        case 'upload':
          return "Enter with AI";
        case 'review':
          return "Review";
        case 'rejected':
          return "Rejected";
        case 'approve':
          return "Approved";
        case 'pay':
          return "Paid";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'manual':
        return "Enter Manually";
      case 'upload':
        return `Enter with AI (${displayCount})`;
      case 'review':
        return `Review (${displayCount})`;
      case 'rejected':
        return `Rejected (${displayCount})`;
      case 'approve':
        return `Approved (${displayCount})`;
      case 'pay':
        return `Paid (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  const tabs = reviewOnly
    ? [
        { value: "review", label: getTabLabel('review', counts?.pendingCount) },
        { value: "rejected", label: getTabLabel('rejected', counts?.rejectedCount) },
        { value: "approve", label: getTabLabel('approve', counts?.approvedCount) },
        { value: "pay", label: getTabLabel('pay', counts?.payBillsCount) },
      ]
    : [
        { value: "manual", label: getTabLabel('manual', undefined) },
        { value: "upload", label: getTabLabel('upload', counts?.aiExtractCount) },
        { value: "review", label: getTabLabel('review', counts?.pendingCount) },
        { value: "rejected", label: getTabLabel('rejected', counts?.rejectedCount) },
        { value: "approve", label: getTabLabel('approve', counts?.approvedCount) },
        { value: "pay", label: getTabLabel('pay', counts?.payBillsCount) },
      ];

  return (
    <>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${reviewOnly ? 'grid-cols-4' : 'grid-cols-6'}`}>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {!reviewOnly && (
        <>
          <TabsContent value="manual" className="mt-6">
            <ManualBillEntry />
          </TabsContent>

          <TabsContent value="upload" className="mt-6 space-y-6">
            <SimplifiedAIBillExtraction 
              onDataExtracted={() => {}}
              onSwitchToManual={() => setActiveTab("manual")}
              suppressIndividualToasts={true}
              onExtractionStart={(total) => handleExtractionStart()}
              onExtractionComplete={handleExtractionComplete}
              onExtractionProgress={handleExtractionProgress}
            />

          {isExtracting ? (
            <div className="h-64 flex items-center justify-center rounded-md border bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  Processing {extractingCount} PDF{extractingCount !== 1 ? "s" : ""}...
                </span>
              </div>
            </div>
          ) : batchBills.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Bills</CardTitle>
                <CardDescription>Upload PDF files above to extract bill data automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>No bills uploaded yet</p>
                  <p className="text-sm">Upload PDF files above to extract bill data automatically</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Extracted Bills</CardTitle>
                    <CardDescription>
                      Review and edit {batchBills.length} bill{batchBills.length > 1 ? "s" : ""} before submitting
                    </CardDescription>
                  </div>
                  <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="lg">
                    {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BatchBillReviewTable
                  bills={batchBills}
                  onBillUpdate={handleBillUpdate}
                  onBillDelete={handleBillDelete}
                  onLinesUpdate={handleLinesUpdate}
                  selectedBillIds={selectedBillIds}
                  onBillSelect={handleBillSelect}
                  onSelectAll={handleSelectAll}
                  showProjectColumn={!effectiveProjectId}
                />
              </CardContent>
            </Card>
          )}
          </TabsContent>
        </>
      )}

      <TabsContent value="review" className="mt-6">
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <BillsApprovalTable 
          status="draft"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
        />
      </TabsContent>

      <TabsContent value="rejected" className="mt-6">
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <BillsApprovalTable 
          status="void"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
          showEditButton={true}
        />
      </TabsContent>

      <TabsContent value="approve" className="mt-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex items-center gap-4 px-4 rounded-lg border bg-background" style={{ height: '40px' }}>
            <span className="text-sm font-medium whitespace-nowrap">Show bills</span>
            <RadioGroup value={dueDateFilter} onValueChange={(value) => setDueDateFilter(value as "all" | "due-on-or-before")} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="due-on-or-before" id="due-filter" />
                <Label htmlFor="due-filter" className="cursor-pointer font-normal whitespace-nowrap">Due on or before</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={dueDateFilter !== "due-on-or-before"}
                      className={cn(
                        "w-[150px] justify-start text-left font-normal h-8 text-xs text-foreground",
                        !filterDate && "text-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 text-foreground" />
                      {filterDate ? format(filterDate, "MM/dd/yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={setFilterDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="all-filter" />
                <Label htmlFor="all-filter" className="cursor-pointer font-normal whitespace-nowrap">Show all bills</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <PayBillsTable 
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          searchQuery={searchQuery}
          dueDateFilter={dueDateFilter}
          filterDate={filterDate}
        />
      </TabsContent>

      <TabsContent value="pay" className="mt-6">
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <BillsApprovalTable 
          status="paid"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
        />
      </TabsContent>
    </Tabs>

    {/* Multi-lot allocation dialog */}
    <LotAllocationDialog
      open={showLotAllocationDialog}
      onOpenChange={setShowLotAllocationDialog}
      lots={lots}
      totalAmount={pendingAllocationData?.totalAmount || 0}
      billCount={pendingAllocationData?.bills.length || 0}
      onConfirm={handleAllocationConfirm}
      onCancel={handleAllocationCancel}
    />
    </>
  );
}
