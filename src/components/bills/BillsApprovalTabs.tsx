import { useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { ContentSidebar } from "@/components/ui/ContentSidebar";
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
import SimplifiedAIBillExtraction, { type SimplifiedAIBillExtractionHandle } from "./SimplifiedAIBillExtraction";
import { BatchBillReviewTable } from "./BatchBillReviewTable";
import { ManualBillEntry } from "./ManualBillEntry";
import { LotAllocationDialog, type LotAllocation } from "./LotAllocationDialog"; // Kept for future custom allocation feature
import { usePendingBills, type PendingBill, type PendingBillLine } from "@/hooks/usePendingBills";
import { useReferenceNumberValidation } from "@/hooks/useReferenceNumberValidation";
import { useBillCounts } from "@/hooks/useBillCounts";
import { useLots } from "@/hooks/useLots";
import { supabase } from "@/integrations/supabase/client";
import { getBestPOLineMatch, type POLineCandidate } from "@/utils/poLineMatching";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function UploadDropzone({ onDrop }: { onDrop: (files: File[]) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'application/pdf': ['.pdf'] },
  });

  return (
    <Card>
      <div
        {...getRootProps()}
        className={`p-8 text-center cursor-pointer ${
          isDragActive ? 'bg-blue-50 border-blue-400' : ''
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragActive ? 'Drop PDFs here' : 'Upload bills by dragging and dropping here'}
        </h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop PDF files here, or use the Upload PDFs button above
        </p>
        <p className="text-sm text-muted-foreground">
          Supports: PDF
        </p>
      </div>
    </Card>
  );
}

interface BillsApprovalTabsProps {
  projectId?: string;
  projectIds?: string[];
  reviewOnly?: boolean;
  onHeaderActionChange?: (actions: ReactNode) => void;
}

interface BatchBill extends PendingBill {
  vendor_id?: string;
  vendor_name?: string;
  bill_date?: string;
  due_date?: string;
  reference_number?: string;
  lines: PendingBillLine[];
  attachments?: Array<{ id: string; file_name: string; file_path: string }>;
}

export function BillsApprovalTabs({ projectId, projectIds, reviewOnly = false, onHeaderActionChange }: BillsApprovalTabsProps) {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || (reviewOnly ? "review" : "upload");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "due-on-or-before">("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkDuplicate } = useReferenceNumberValidation();
  const extractionRef = useRef<SimplifiedAIBillExtractionHandle>(null);
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
  
  // Multi-lot allocation dialog state (kept for future custom allocation feature)
  const [showLotAllocationDialog, setShowLotAllocationDialog] = useState(false);
  const [pendingAllocationData, setPendingAllocationData] = useState<{
    bills: BatchBill[];
    totalAmount: number;
  } | null>(null);
  // Fetch and sync pending bills with their lines, auto-split across lots immediately
  useEffect(() => {
    if (!pendingBills || pendingBills.length === 0) {
      setBatchBills([]);
      setSelectedBillIds(new Set());
      return;
    }

    // Create an abortable async effect
    let cancelled = false;
    
    const fetchAllLines = async () => {
      // First fetch all lines with lot info
      const billsWithLines: BatchBill[] = await Promise.all(
        pendingBills.map(async (bill) => {
          if (cancelled) return { ...bill, lines: [] as PendingBillLine[], attachments: [] };
          
          const [linesResult, attachmentsResult] = await Promise.all([
            supabase
              .from('pending_bill_lines')
              .select('*, project_lots(id, lot_number, lot_name)')
              .eq('pending_upload_id', bill.id)
              .order('line_number'),
            supabase
              .from('bill_attachments')
              .select('id, file_name, file_path')
              .eq('pending_upload_id', bill.id),
          ]);

          if (linesResult.error) {
            console.error(`Error fetching lines for bill ${bill.id}:`, linesResult.error);
            return { ...bill, lines: [] as PendingBillLine[], attachments: attachmentsResult.data || [] };
          }

          // Map lot_name from joined data
          const processedLines = (linesResult.data || []).map((line: any) => ({
            ...line,
            lot_name: line.project_lots?.lot_name || 
                      (line.project_lots ? `Lot ${line.project_lots.lot_number}` : null),
          })) as PendingBillLine[];

          return { ...bill, lines: processedLines, attachments: attachmentsResult.data || [] };
        })
      );

      if (cancelled) return;

      // Check if we need to auto-split (1 lot = assign to that lot, 2+ lots = split evenly)
      if (lots.length >= 1 && effectiveProjectId) {
        const billsNeedingLotAssignment = billsWithLines.filter(bill =>
          bill.lines?.some((line: any) => !line.lot_id)
        );

        if (billsNeedingLotAssignment.length > 0) {
          if (lots.length === 1) {
            // Single lot: assign directly in DB
            const singleLot = lots[0];
            const allLineIds = billsNeedingLotAssignment.flatMap(bill =>
              bill.lines?.filter((l: any) => !l.lot_id).map((l: any) => l.id) || []
            );
            
            if (allLineIds.length > 0) {
              await supabase
                .from('pending_bill_lines')
                .update({ lot_id: singleLot.id })
                .in('id', allLineIds);
              
              // Update local state with lot info
              billsWithLines.forEach(bill => {
                bill.lines = bill.lines?.map((line: any) => ({
                  ...line,
                  lot_id: line.lot_id || singleLot.id,
                  lot_name: line.lot_name || singleLot.lot_name || `Lot ${singleLot.lot_number}`,
                })) || [];
              });
            }
          } else {
            // Multiple lots: call edge function to split evenly
            const { error } = await supabase.functions.invoke('split-pending-bill-lines', {
              body: {
                pendingUploadIds: billsNeedingLotAssignment.map(b => b.id),
                projectId: effectiveProjectId
              }
            });
            
            if (error) {
              console.error('Failed to auto-split bills:', error);
            } else {
              // Refetch to get the split lines with lot assignments
              const refetchedBills = await Promise.all(
                billsWithLines.map(async (bill) => {
                  if (cancelled) return bill;
                  
                  const { data: lines } = await supabase
                    .from('pending_bill_lines')
                    .select('*, project_lots(id, lot_number, lot_name)')
                    .eq('pending_upload_id', bill.id)
                    .order('line_number');

                  const processedLines = (lines || []).map((line: any) => ({
                    ...line,
                    lot_name: line.project_lots?.lot_name || 
                              (line.project_lots ? `Lot ${line.project_lots.lot_number}` : null),
                  })) as PendingBillLine[];

                  return { ...bill, lines: processedLines };
                })
              );
              
              if (!cancelled) {
                setBatchBills(refetchedBills);
                setSelectedBillIds(new Set(refetchedBills.map(b => b.id)));
                return;
              }
            }
          }
        }
      }

      // --- PO Auto-Matching on initial load ---
      // Collect unique vendor IDs from extracted data
      const vendorMap = new Map<string, BatchBill[]>();
      for (const bill of billsWithLines) {
        const vendorId = bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
        if (vendorId) {
          const arr = vendorMap.get(vendorId) || [];
          arr.push(bill);
          vendorMap.set(vendorId, arr);
        }
      }

      // For each vendor, fetch POs and run matching on unmatched lines
      if (vendorMap.size > 0 && effectiveProjectId) {
        const vendorIds = [...vendorMap.keys()];

        // Fetch approved POs for all vendors at once
        const { data: allPOs } = await supabase
          .from('project_purchase_orders')
          .select('id, po_number, total_amount, cost_code_id, company_id')
          .eq('project_id', effectiveProjectId)
          .in('company_id', vendorIds)
          .eq('status', 'approved');

        if (allPOs && allPOs.length > 0) {
          const poIds = allPOs.map(po => po.id);

          // Fetch PO line items and cost codes in parallel
          const [poLinesResult, billedResult] = await Promise.all([
            supabase
              .from('purchase_order_lines')
              .select('id, purchase_order_id, description, cost_code_id, amount')
              .in('purchase_order_id', poIds),
            supabase
              .from('bill_lines')
              .select('purchase_order_line_id, amount')
              .in('purchase_order_line_id', poIds.length > 0 ? poIds : ['__none__'])
              .not('purchase_order_line_id', 'is', null),
          ]);

          const poLines = poLinesResult.data || [];

          // Fetch cost code names for PO lines
          const ccIds = [...new Set(poLines.map(l => l.cost_code_id).filter(Boolean))] as string[];
          let ccMap = new Map<string, string>();
          if (ccIds.length > 0) {
            const { data: ccs } = await supabase
              .from('cost_codes')
              .select('id, name')
              .in('id', ccIds);
            if (ccs) ccMap = new Map(ccs.map(c => [c.id, c.name]));
          }

          // Build billed-per-line map from actual bill_lines
          const billedByLineId = new Map<string, number>();
          (billedResult.data || []).forEach((bl: any) => {
            if (bl.purchase_order_line_id) {
              billedByLineId.set(bl.purchase_order_line_id, (billedByLineId.get(bl.purchase_order_line_id) || 0) + (bl.amount || 0));
            }
          });

          // Group PO lines by vendor (via PO's company_id)
          const poByVendor = new Map<string, typeof allPOs>();
          allPOs.forEach(po => {
            const arr = poByVendor.get(po.company_id) || [];
            arr.push(po);
            poByVendor.set(po.company_id, arr);
          });

          // Run matching for each bill's unmatched lines
          const dbUpdates: { id: string; purchase_order_id: string; purchase_order_line_id: string | null }[] = [];

          for (const [vendorId, bills] of vendorMap) {
            const vendorPOs = poByVendor.get(vendorId) || [];
            if (vendorPOs.length === 0) continue;

            const vendorPOIds = new Set(vendorPOs.map(p => p.id));
            const vendorPOLines: POLineCandidate[] = poLines
              .filter(l => vendorPOIds.has(l.purchase_order_id))
              .map(l => ({
                id: l.id,
                purchase_order_id: l.purchase_order_id,
                description: l.description,
                cost_code_id: l.cost_code_id,
                cost_code_name: l.cost_code_id ? ccMap.get(l.cost_code_id) || null : null,
                amount: l.amount || 0,
                remaining: (l.amount || 0) - (billedByLineId.get(l.id) || 0),
              }));

            if (vendorPOLines.length === 0) continue;

            // Helper to normalize a PO reference (strip non-alphanumeric, uppercase)
            const normRef = (s: string | null | undefined) =>
              s ? String(s).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

            for (const bill of bills) {
              for (const line of bill.lines || []) {
                if (line.purchase_order_id) continue; // already matched

                // HIGHEST PRIORITY: PO number printed directly on the invoice line
                const printedRef = normRef((line as any).po_reference);
                if (printedRef) {
                  const byNumber = vendorPOs.find(p => normRef(p.po_number).includes(printedRef));
                  if (byNumber) {
                    line.purchase_order_id = byNumber.id;
                    dbUpdates.push({ id: line.id, purchase_order_id: byNumber.id, purchase_order_line_id: null });
                    continue;
                  }
                }

                const match = getBestPOLineMatch(
                  line.memo || line.description || '',
                  line.amount || 0,
                  line.cost_code_id || undefined,
                  vendorPOLines,
                  50
                );

                if (match) {
                  line.purchase_order_id = match.poId;
                  (line as any).purchase_order_line_id = match.poLineId;
                  dbUpdates.push({ id: line.id, purchase_order_id: match.poId, purchase_order_line_id: match.poLineId });
                }
              }
            }
          }

          // Batch-persist matches to DB
          if (dbUpdates.length > 0) {
            await Promise.all(
              dbUpdates.map(u =>
                supabase
                  .from('pending_bill_lines')
                  .update({
                    purchase_order_id: u.purchase_order_id,
                    purchase_order_line_id: u.purchase_order_line_id,
                  })
                  .eq('id', u.id)
              )
            );
          }
        }
      }
      // --- End PO Auto-Matching ---

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
  }, [pendingBills, lots, effectiveProjectId]);

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
        const billVendorId = bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
        
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

      // Lot splitting is now handled on load (useEffect), no need to split here
      // Map validated bills to the format expected by batchApproveBills
      const billsToApprove = validatedBills.map(bill => {
        // Extract data from extracted_data with fallbacks to root properties
        const vendorId = bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
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

  // Handler for lot allocation confirmation (kept for future custom allocation feature)
  const handleAllocationConfirm = useCallback(async (_allocations: LotAllocation[]) => {
    // Currently unused - auto-split is now handled by edge function
    setShowLotAllocationDialog(false);
    setPendingAllocationData(null);
  }, []);

  const handleAllocationCancel = useCallback(() => {
    setShowLotAllocationDialog(false);
    setPendingAllocationData(null);
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

  const sidebarItems = tabs.map(tab => ({ value: tab.value, label: tab.label }));

  // Emit header actions based on active tab
  useEffect(() => {
    if (!onHeaderActionChange) return;

    if (activeTab === 'review' || activeTab === 'rejected' || activeTab === 'pay') {
      onHeaderActionChange(
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      );
    } else if (activeTab === 'approve') {
      onHeaderActionChange(
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 rounded-lg border bg-background h-9">
            <span className="text-xs font-medium whitespace-nowrap">Show bills</span>
            <RadioGroup value={dueDateFilter} onValueChange={(value) => setDueDateFilter(value as "all" | "due-on-or-before")} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="due-on-or-before" id="due-filter" />
                <Label htmlFor="due-filter" className="cursor-pointer font-normal whitespace-nowrap text-xs">Due on or before</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={dueDateFilter !== "due-on-or-before"}
                      className={cn(
                        "w-[130px] justify-start text-left font-normal h-7 text-xs text-foreground",
                        !filterDate && "text-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3 text-foreground" />
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
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="all" id="all-filter" />
                <Label htmlFor="all-filter" className="cursor-pointer font-normal whitespace-nowrap text-xs">All</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      );
    } else if (activeTab === 'upload') {
      onHeaderActionChange(
        <div className="flex items-center gap-2">
          <SimplifiedAIBillExtraction 
            ref={extractionRef}
            onDataExtracted={() => {}}
            onSwitchToManual={() => setActiveTab("manual")}
            suppressIndividualToasts={true}
            onExtractionStart={(total) => handleExtractionStart()}
            onExtractionComplete={handleExtractionComplete}
            onExtractionProgress={handleExtractionProgress}
          />
          {batchBills.length > 0 && (
            <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="sm" className="bg-black hover:bg-gray-800 text-white">
              {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
            </Button>
          )}
        </div>
      );
    } else {
      onHeaderActionChange(null);
    }

    return () => onHeaderActionChange(null);
  }, [onHeaderActionChange, activeTab, searchQuery, dueDateFilter, filterDate, handleExtractionStart, handleExtractionComplete, batchBills.length, selectedBillIds.size, isSubmitting]);

  return (
    <>
    <div className="flex flex-1 overflow-hidden">
      <ContentSidebar
        title="Bill Actions"
        icon={Receipt}
        items={sidebarItems}
        activeItem={activeTab}
        onItemChange={setActiveTab}
      />
      <div className="flex-1 min-w-0 px-6 pt-3 pb-6 overflow-auto">

      {!reviewOnly && activeTab === "manual" && (
            <ManualBillEntry />
      )}

      {!reviewOnly && activeTab === "upload" && (
          <div className="space-y-4">
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
            <UploadDropzone onDrop={(files) => extractionRef.current?.dropFiles(files)} />
          ) : (
            <>
              <BatchBillReviewTable
                bills={batchBills}
                onBillUpdate={handleBillUpdate}
                onBillDelete={handleBillDelete}
                onLinesUpdate={handleLinesUpdate}
                selectedBillIds={selectedBillIds}
                onBillSelect={handleBillSelect}
                onSelectAll={handleSelectAll}
                showProjectColumn={!effectiveProjectId}
                projectId={effectiveProjectId}
              />
            </>
          )}
          </div>
      )}

      {activeTab === "review" && (
        <BillsApprovalTable 
          status="draft"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === "rejected" && (
        <BillsApprovalTable 
          status="void"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
          showEditButton={true}
        />
      )}

      {activeTab === "approve" && (
        <PayBillsTable 
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          searchQuery={searchQuery}
          dueDateFilter={dueDateFilter}
          filterDate={filterDate}
        />
      )}

      {activeTab === "pay" && (
        <BillsApprovalTable 
          status="paid"
          projectId={effectiveProjectId} 
          projectIds={projectIds}
          showProjectColumn={false}
          enableSorting={true}
          searchQuery={searchQuery}
          showEditButton={true}
        />
      )}

      </div>
    </div>

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
