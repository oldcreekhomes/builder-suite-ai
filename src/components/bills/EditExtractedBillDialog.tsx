import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, StickyNote } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { BillNotesDialog } from "./BillNotesDialog";
import { cn } from "@/lib/utils";
import { normalizeToYMD, toDateLocal } from "@/utils/dateOnly";
import { usePendingBills } from "@/hooks/usePendingBills";
import { useLots } from "@/hooks/useLots";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFileIcon, getFileIconColor, getCleanFileName } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { useReferenceNumberValidation } from "@/hooks/useReferenceNumberValidation";
import { POSelectionDropdown, useShouldShowPOSelection } from "./POSelectionDropdown";
import { sanitizePoId } from "@/utils/poSentinelUtils";
import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { getBestPOLineMatch, POLineCandidate } from "@/utils/poLineMatching";
// Normalize terms from any format to standardized dropdown values
function normalizeTermsForUI(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  
  // Already in correct format
  if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
    return terms;
  }
  
  // Try to normalize
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes('15')) return 'net-15';
  if (normalized.includes('60')) return 'net-60';
  if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
  
  // Default to net-30
  return 'net-30';
}

// Compute due date from bill date and terms
function computeDueDate(billDate: Date, terms: string): Date {
  const result = new Date(billDate);
  switch (terms) {
    case 'net-15':
      result.setDate(result.getDate() + 15);
      break;
    case 'net-30':
      result.setDate(result.getDate() + 30);
      break;
    case 'net-60':
      result.setDate(result.getDate() + 60);
      break;
    case 'due-on-receipt':
      // Due on receipt = same day as bill date
      break;
    default:
      result.setDate(result.getDate() + 30);
  }
  return result;
}

interface EditExtractedBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUploadId: string;
}

interface LineItem {
  id: string;
  line_type: string;
  account_id?: string;
  account_display?: string;
  cost_code_id?: string;
  cost_code_display?: string;
  purchase_order_id?: string;
  purchase_order_line_id?: string;
  po_assignment?: 'none' | 'auto' | null;
  lot_id?: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  memo?: string;
  matchingText?: string;
  poConfidence?: number;
}

export function EditExtractedBillDialog({
  open,
  onOpenChange,
  pendingUploadId,
}: EditExtractedBillDialogProps) {
  const { projectId } = useParams();
  const { pendingBills, updateLine, addLine, deleteLine } = usePendingBills();
  const { lots } = useLots(projectId);
  const showAddressColumn = lots.length > 1;
  const [vendorId, setVendorId] = useState<string>("");
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>();
  const [refNo, setRefNo] = useState<string>("");
  const [terms, setTerms] = useState<string>("net-30");
  const [isDueAuto, setIsDueAuto] = useState<boolean>(true);
  const [jobCostLines, setJobCostLines] = useState<LineItem[]>([]);
  const [expenseLines, setExpenseLines] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Array<{ id: string; file_name: string; file_path: string }>>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("job-cost");
  const [defaultCostCodeId, setDefaultCostCodeId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const { openBillAttachment } = useUniversalFilePreviewContext();
  const { checkDuplicate } = useReferenceNumberValidation();
  const showPOSelection = useShouldShowPOSelection(projectId, vendorId);
  const { data: vendorPOs } = useVendorPurchaseOrders(projectId, vendorId);
  const hasAutoMatched = useRef(false);
  // Per-line guard: never re-run auto-match for a line we've already evaluated this open-cycle.
  const autoMatchedLineIds = useRef<Set<string>>(new Set());
  // Lines the user has manually picked a PO (or "No PO") for during this session.
  // The auto-matcher must never overwrite these.
  const userTouchedPoLineIds = useRef<Set<string>>(new Set());

  const handleRemoveAttachment = async (attachment: { id: string; file_name: string; file_path: string }) => {
    try {
      // Delete from storage
      await supabase.storage.from('bill-attachments').remove([attachment.file_path]);
      // Delete from bill_attachments table
      await supabase.from('bill_attachments').delete().eq('id', attachment.id);
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast({ title: "Attachment removed", description: "The file was deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to remove attachment: ${err.message}`, variant: "destructive" });
    }
  };


  useEffect(() => {
    if (open) {
      hasAutoMatched.current = false;
      autoMatchedLineIds.current = new Set();
      userTouchedPoLineIds.current = new Set();
    }
  }, [open]);

  // Load bill data
  useEffect(() => {
    if (!open || !pendingUploadId) return;

    const loadBillData = async () => {
      const bill = pendingBills?.find(b => b.id === pendingUploadId);
      if (!bill) return;

      const extractedData = bill.extracted_data || {};
      const extractedVendorId = extractedData.vendor_id || extractedData.vendorId || "";
      
      setVendorId(extractedVendorId);
      setRefNo(extractedData.reference_number || extractedData.referenceNumber || "");
      setTerms(normalizeTermsForUI(extractedData.terms));
      setInternalNotes(extractedData.notes || "");

      // Load attachments from bill_attachments table (new multi-file path)
      const { data: attachmentRows } = await supabase
        .from('bill_attachments')
        .select('id, file_name, file_path')
        .eq('pending_upload_id', pendingUploadId);

      if (attachmentRows && attachmentRows.length > 0) {
        setAttachments(attachmentRows as Array<{ id: string; file_name: string; file_path: string }>);
      } else if (bill.file_name) {
        // Legacy fallback: single file stored on pending_bill_uploads itself
        setAttachments([{ id: 'legacy', file_name: bill.file_name, file_path: bill.file_path }]);
      } else {
        setAttachments([]);
      }

      let loadedBillDate = new Date();
      if (extractedData.bill_date || extractedData.billDate) {
        loadedBillDate = toDateLocal(normalizeToYMD(extractedData.bill_date || extractedData.billDate));
        setBillDate(loadedBillDate);
      }
      
      if (extractedData.due_date || extractedData.dueDate) {
        setDueDate(toDateLocal(normalizeToYMD(extractedData.due_date || extractedData.dueDate)));
        setIsDueAuto(false); // User or AI provided due date, don't auto-calculate
      } else {
        // No due date provided, compute it from bill date and terms
        const loadedTerms = normalizeTermsForUI(extractedData.terms);
        setDueDate(computeDueDate(loadedBillDate, loadedTerms));
        setIsDueAuto(true);
      }

      // Fetch default cost code if vendor has exactly 1
      let defaultCostCode: string | null = null;
      if (extractedVendorId) {
        const { data: costCodeData } = await supabase
          .from('company_cost_codes')
          .select('cost_code_id')
          .eq('company_id', extractedVendorId);

        if (costCodeData && costCodeData.length === 1) {
          defaultCostCode = costCodeData[0].cost_code_id;
          setDefaultCostCodeId(defaultCostCode);
        }
      }

      // Fetch line items
      const { data } = await supabase
        .from('pending_bill_lines')
        .select('*')
        .eq('pending_upload_id', pendingUploadId)
        .order('line_number');

      if (data) {
          const extractedTotal = Number(extractedData.totalAmount || extractedData.total_amount) || 0;
          
          // Build job cost and expense arrays, promoting expense lines to job_cost when a single default cost code exists
          const poOverrides: Record<string, string> | undefined = extractedData.po_overrides;
          let jobCost: LineItem[] = [];
          let expense: LineItem[] = [];

          for (const line of data) {
            const qty = Number(line.quantity) || 1;
            const rawUnitCost = Number(line.unit_cost) || 0;
            let amt = Number(line.amount) || 0;

            // Prefer computing amount from quantity * unit_cost when amount is missing/zero
            if ((amt <= 0 || !Number.isFinite(amt)) && rawUnitCost > 0) {
              amt = Math.round(qty * rawUnitCost * 100) / 100;
            }

            // Sanity guard for absurd amounts (preserves legitimate multi-line invoices)
            if (amt > 1000000 && qty > 0) {
              const reasonableUnitCost = extractedTotal > 0 ? extractedTotal / qty : 100;
              console.log(`Correcting absurd amount ${amt} to ${reasonableUnitCost * qty}`);
              amt = reasonableUnitCost * qty;
            }

            // If unit_cost wasn't provided, back-calculate from amount
            const unitCost = rawUnitCost > 0 ? rawUnitCost : (qty > 0 && amt > 0 ? Math.round((amt / qty) * 100) / 100 : 0);

            // Fetch cost code display string if applicable
            let costCodeDisplay = '';
            const costCodeToUse = line.cost_code_id || defaultCostCode;
            if (costCodeToUse) {
              const { data: ccData } = await supabase
                .from('cost_codes')
                .select('code, name')
                .eq('id', costCodeToUse)
                .single();
              if (ccData) {
                costCodeDisplay = `${ccData.code} - ${ccData.name}`;
              }
            }

            if (line.line_type === 'job_cost') {
              jobCost.push({
                id: line.id,
                line_type: 'job_cost',
                cost_code_id: costCodeToUse || undefined,
                cost_code_display: costCodeDisplay || undefined,
                purchase_order_id: poOverrides?.[line.id] || line.purchase_order_id || undefined,
                purchase_order_line_id: (line as any).purchase_order_line_id || undefined,
                po_assignment: ((line as any).po_assignment as 'none' | 'auto' | null) ?? null,
                lot_id: line.lot_id || undefined,
                quantity: qty,
                unit_cost: unitCost,
                amount: amt,
                memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || "",
                matchingText: line.description || line.memo || "",
              });
            } else if (line.line_type === 'expense') {
              // If vendor has exactly one cost code and the expense line isn't categorized, promote it to job_cost
              if (defaultCostCode && !line.account_id && !line.cost_code_id) {
                jobCost.push({
                  id: line.id,
                  line_type: 'job_cost',
                  cost_code_id: defaultCostCode,
                  cost_code_display: costCodeDisplay || undefined,
                  purchase_order_id: poOverrides?.[line.id] || line.purchase_order_id || undefined,
                  purchase_order_line_id: (line as any).purchase_order_line_id || undefined,
                  po_assignment: ((line as any).po_assignment as 'none' | 'auto' | null) ?? null,
                  lot_id: line.lot_id || undefined,
                  quantity: qty,
                  unit_cost: unitCost,
                  amount: amt,
                  memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || "",
                  matchingText: line.description || line.memo || "",
                });
              } else {
                expense.push({
                  id: line.id,
                  line_type: 'expense',
                  account_id: line.account_id || undefined,
                  quantity: qty,
                  unit_cost: unitCost,
                  amount: amt,
                  memo: line.memo || (line.description && line.description.length <= 120 ? line.description : "") || "",
                  matchingText: line.description || line.memo || "",
                });
              }
          }
          }

          // NOTE: We intentionally DO NOT collapse multi-line bills into a single
          // "Amount Due" line when the line sum disagrees with the extracted total.
          // The user must always see the real saved rows so they can correct them;
          // collapsing destroys legitimate multi-line invoices (e.g. multi-PO bills).
          const allLines = [...jobCost, ...expense];
          const lineSum = allLines.reduce((sum, line) => sum + line.amount, 0);
          if (extractedTotal > 0 && Math.abs(lineSum - extractedTotal) > 0.01) {
            console.warn(
              `Line sum (${lineSum}) differs from extracted total (${extractedTotal}). Showing line breakdown for user review.`
            );
          }
          
          // Filter out any $0 lines - they serve no accounting purpose
          jobCost = jobCost.filter(line => line.amount > 0);
          expense = expense.filter(line => line.amount > 0);

          // If any loaded line already has a PO, or user previously saved edits, skip auto-matching
          const anyLineHasPO = [...jobCost, ...expense].some(l => !!l.purchase_order_id);
          const userPreviouslyEdited = !!extractedData.user_edited;
          if (anyLineHasPO || userPreviouslyEdited) {
            hasAutoMatched.current = true;
          }

          setJobCostLines(jobCost);
          setExpenseLines(expense);

          // Default to the tab that has data
          if (expense.length > 0 && jobCost.length === 0) {
            setActiveTab("expense");
          } else if (jobCost.length > 0) {
            setActiveTab("job-cost");
          }
      }
    };

    loadBillData();
  }, [open, pendingUploadId, pendingBills]);

  // Re-apply default cost code when vendor changes
  useEffect(() => {
    if (!open || !vendorId) return;
    const applyDefault = async () => {
      const { data: cc } = await supabase
        .from('company_cost_codes')
        .select('cost_code_id')
        .eq('company_id', vendorId);
      if (cc && cc.length === 1) {
        const id = cc[0].cost_code_id as string;
        setDefaultCostCodeId(id);
        
        // Fetch display string for default cost code
        const { data: ccData } = await supabase
          .from('cost_codes')
          .select('code, name')
          .eq('id', id)
          .single();
        const display = ccData ? `${ccData.code} - ${ccData.name}` : '';
        
        setJobCostLines(prev => prev.map(l => ({ 
          ...l, 
          cost_code_id: l.cost_code_id || id,
          cost_code_display: l.cost_code_display || display
        })));
        setExpenseLines(prev => {
          const keep: LineItem[] = [];
          const promote: LineItem[] = [];
          prev.forEach(l => {
            if (!l.account_id && !l.cost_code_id) {
              promote.push({ ...l, line_type: 'job_cost', cost_code_id: id, cost_code_display: display });
            } else {
              keep.push(l);
            }
          });
          if (promote.length) {
            setJobCostLines(prevJ => [...prevJ, ...promote]);
          }
          return keep;
        });
      } else {
        setDefaultCostCodeId(null);
      }
    };
    applyDefault();
  }, [vendorId, open]);

  // Auto-calculate due date when terms change
  useEffect(() => {
    if (!open) return;
    const newDueDate = computeDueDate(billDate, terms);
    setDueDate(newDueDate);
    setIsDueAuto(true);
  }, [terms, open]);

  // Auto-calculate due date when bill date changes (only if auto mode)
  useEffect(() => {
    if (!open || !isDueAuto) return;
    const newDueDate = computeDueDate(billDate, terms);
    setDueDate(newDueDate);
  }, [billDate, isDueAuto, terms, open]);

  // Auto-match job cost lines to PO lines when both PO data AND lines are ready.
  // CRITICAL: must never overwrite a line the user explicitly chose "No PO" for,
  // a line the user manually picked, or a line we already auto-evaluated this open-cycle.
  useEffect(() => {
    if (!vendorPOs || vendorPOs.length === 0 || jobCostLines.length === 0) return;

    // Build flat list of PO line candidates, using PO header cost code as fallback
    const allPOLines: POLineCandidate[] = vendorPOs.flatMap(po =>
      po.line_items.map(line => ({
        id: line.id,
        purchase_order_id: po.id,
        description: line.description,
        cost_code_id: line.cost_code_id,
        cost_code_name: line.cost_code?.name || po.cost_code?.name || null,
        amount: line.amount,
        remaining: line.remaining,
      }))
    );

    if (allPOLines.length === 0) return;

    // A line is "off-limits" to the auto-matcher if:
    //   - user explicitly chose "No PO" (sentinel or persisted po_assignment)
    //   - user manually touched it this session
    //   - it already has any PO assignment
    //   - we already auto-evaluated it this open-cycle (prevents loops)
    const isOffLimits = (l: LineItem): boolean =>
      l.purchase_order_id === '__none__' ||
      l.po_assignment === 'none' ||
      userTouchedPoLineIds.current.has(l.id) ||
      autoMatchedLineIds.current.has(l.id) ||
      !!l.purchase_order_id;

    const candidates = jobCostLines.filter(l => !isOffLimits(l));
    if (candidates.length === 0) return;

    let didChange = false;
    const newMatches: Array<{ id: string; poId: string; poLineId: string; confidence: number }> = [];

    const updatedLines = jobCostLines.map(line => {
      if (isOffLimits(line)) return line;
      // Mark as evaluated so we never re-attempt for this line in this open-cycle.
      autoMatchedLineIds.current.add(line.id);

      const match = getBestPOLineMatch(
        line.matchingText || line.memo || '',
        line.amount,
        line.cost_code_id,
        allPOLines,
        30
      );

      if (match) {
        didChange = true;
        if (!line.id.startsWith('new-')) {
          newMatches.push({
            id: line.id,
            poId: match.poId,
            poLineId: match.poLineId,
            confidence: match.confidence,
          });
        }
        // Inherit cost code from the matched PO line when the line currently has none.
        // This prevents the editor from showing a blank Cost Code while the line is
        // visibly bound to a PO with a known cost code.
        const matchedPOLine = allPOLines.find(p => p.id === match.poLineId);
        const inheritCostCodeId =
          !line.cost_code_id && matchedPOLine?.cost_code_id
            ? matchedPOLine.cost_code_id
            : line.cost_code_id;
        const inheritCostCodeDisplay =
          !line.cost_code_display && matchedPOLine?.cost_code_name
            ? matchedPOLine.cost_code_name
            : line.cost_code_display;
        return {
          ...line,
          purchase_order_id: match.poId,
          purchase_order_line_id: match.poLineId,
          po_assignment: 'auto' as const,
          poConfidence: match.confidence,
          cost_code_id: inheritCostCodeId,
          cost_code_display: inheritCostCodeDisplay,
        };
      }
      return line;
    });

    if (didChange) {
      setJobCostLines(updatedLines);
    }

    // Fire-and-forget: persist PO matches to DB so the table badge updates.
    // Always write po_assignment='auto' so PO Summary can distinguish auto from explicit picks.
    if (newMatches.length > 0) {
      // Snapshot of the post-update lines so we can persist any inherited cost code
      // alongside the PO ids — keeps DB rows and UI in lockstep.
      const linesById = new Map(updatedLines.map(l => [l.id, l]));
      Promise.all(
        newMatches.map(m =>
          supabase
            .from('pending_bill_lines')
            .update({
              purchase_order_id: m.poId,
              purchase_order_line_id: m.poLineId || null,
              po_assignment: 'auto',
              ...(linesById.get(m.id)?.cost_code_id
                ? {
                    cost_code_id: linesById.get(m.id)!.cost_code_id,
                    cost_code_name: linesById.get(m.id)!.cost_code_display || null,
                  }
                : {}),
            } as any)
            .eq('id', m.id)
        )
      ).catch(err => {
        console.error('Failed to auto-persist PO matches:', err);
      });
    }
  }, [vendorPOs, jobCostLines]);

  const createEmptyLine = (type: 'job_cost' | 'expense'): LineItem => ({
    id: `new-${Date.now()}`,
    line_type: type,
    quantity: 1,
    unit_cost: 0,
    amount: 0,
    memo: "",
    ...(type === 'job_cost' && defaultCostCodeId ? { cost_code_id: defaultCostCodeId } : {}),
  });

  const addJobCostLine = async () => {
    const newLine: LineItem = {
      id: `new-${Date.now()}`,
      line_type: 'job_cost',
      quantity: 1,
      unit_cost: 0,
      amount: 0,
      memo: "",
    };

    // If there's a default cost code, fetch and add its display string
    if (defaultCostCodeId) {
      const { data: ccData } = await supabase
        .from('cost_codes')
        .select('code, name')
        .eq('id', defaultCostCodeId)
        .single();
      
      newLine.cost_code_id = defaultCostCodeId;
      newLine.cost_code_display = ccData ? `${ccData.code} - ${ccData.name}` : '';
    }

    setJobCostLines([...jobCostLines, newLine]);
  };

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, createEmptyLine('expense')]);
  };

  const removeJobCostLine = (id: string) => {
    setJobCostLines(jobCostLines.filter(line => line.id !== id));
    if (!id.startsWith('new-')) {
      deleteLine.mutate(id);
    }
  };

  const removeExpenseLine = (id: string) => {
    setExpenseLines(expenseLines.filter(line => line.id !== id));
    if (!id.startsWith('new-')) {
      deleteLine.mutate(id);
    }
  };

  const updateJobCostLine = (id: string, field: keyof LineItem, value: any) => {
    setJobCostLines(lines =>
      lines.map(line => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.amount = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        // If cost_code_display is being updated, keep cost_code_id in sync
        if (field === 'cost_code_display') {
          // The display value is being updated, cost_code_id should be set via onCostCodeSelect
        }
        return updated;
      })
    );
  };

  const updateExpenseLine = (id: string, field: keyof LineItem, value: any) => {
    setExpenseLines(lines =>
      lines.map(line => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.amount = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      })
    );
  };

  const calculateTotal = () => {
    const sumSafe = (arr: LineItem[]) => arr.reduce((s, l) => {
      const v = Number(l.amount);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
    return (sumSafe(jobCostLines) + sumSafe(expenseLines)).toFixed(2);
  };

  // Group sibling split rows together. Lines that share the same
  // cost_code_id + unit_cost + memo + PO (typical output of
  // split-pending-bill-lines) collapse into a single visual row that
  // shows the original invoice math.
  type DisplayLine = {
    key: string;
    children: LineItem[];           // underlying DB rows (one per lot)
    isGrouped: boolean;             // true when 2+ children
    cost_code_id?: string;
    cost_code_display?: string;
    memo?: string;
    unit_cost: number;              // original rate (preserved on split)
    quantity: number;               // SUM of child quantities = invoice qty
    amount: number;                 // SUM of child amounts = invoice total
    lotCost: number;                // amount / lotCount
    lotIds: string[];
    purchase_order_id?: string;
    purchase_order_line_id?: string;
    po_assignment?: 'none' | 'auto' | null;
    poConfidence?: number;
    lot_id?: string;                // only meaningful when !isGrouped
  };

  const buildJobCostDisplayLines = (lines: LineItem[]): DisplayLine[] => {
    const groups = new Map<string, LineItem[]>();
    const order: string[] = [];
    for (const l of lines) {
      const key = [
        l.cost_code_id || '',
        Number(l.unit_cost || 0).toFixed(6),
        (l.memo || '').trim(),
        l.purchase_order_id || '',
        l.purchase_order_line_id || '',
      ].join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(l);
    }
    return order.map((key) => {
      const children = groups.get(key)!;
      const first = children[0];
      const totalQty = children.reduce((s, c) => s + (Number(c.quantity) || 0), 0);
      const totalAmt = children.reduce((s, c) => s + (Number(c.amount) || 0), 0);
      const lotIds = children.map((c) => c.lot_id).filter(Boolean) as string[];
      const lotCount = Math.max(lotIds.length, children.length);
      return {
        key,
        children,
        isGrouped: children.length > 1,
        cost_code_id: first.cost_code_id,
        cost_code_display: first.cost_code_display,
        memo: first.memo,
        unit_cost: Number(first.unit_cost) || 0,
        quantity: totalQty,
        amount: totalAmt,
        lotCost: lotCount > 0 ? totalAmt / lotCount : totalAmt,
        lotIds,
        purchase_order_id: first.purchase_order_id,
        purchase_order_line_id: first.purchase_order_line_id,
        po_assignment: first.po_assignment,
        poConfidence: first.poConfidence,
        lot_id: first.lot_id,
      };
    });
  };

  const jobCostDisplayLines = buildJobCostDisplayLines(jobCostLines);

  // Apply an edit made on a grouped row back to its underlying child rows.
  // Quantity / unit_cost / amount are split cent-precise across children;
  // metadata is mirrored to every child.
  const updateJobCostGroup = (
    group: DisplayLine,
    patch: Partial<Pick<LineItem,
      'cost_code_id' | 'cost_code_display' | 'memo' | 'unit_cost' | 'quantity'
      | 'purchase_order_id' | 'purchase_order_line_id' | 'po_assignment' | 'poConfidence'>>,
  ) => {
    setJobCostLines((prev) => {
      const childIds = new Set(group.children.map((c) => c.id));
      const lotCount = Math.max(group.children.length, 1);

      const newUnit = patch.unit_cost !== undefined ? Number(patch.unit_cost) || 0 : group.unit_cost;
      const newQty = patch.quantity !== undefined ? Number(patch.quantity) || 0 : group.quantity;
      const newTotal = Math.round(newQty * newUnit * 100) / 100;

      const evenCents = Math.floor((newTotal * 100) / lotCount);
      const remainderCents = Math.round(newTotal * 100) - evenCents * lotCount;
      const evenQty = Math.floor((newQty * 1e6) / lotCount) / 1e6;
      const qtyRemainder = Math.round((newQty - evenQty * lotCount) * 1e6) / 1e6;

      let i = 0;
      return prev.map((l) => {
        if (!childIds.has(l.id)) return l;
        const isLast = i === lotCount - 1;
        const childAmt = (isLast ? evenCents + remainderCents : evenCents) / 100;
        const childQty = isLast
          ? Math.round((evenQty + qtyRemainder) * 1e6) / 1e6
          : evenQty;
        i += 1;
        return {
          ...l,
          ...('cost_code_id' in patch ? { cost_code_id: patch.cost_code_id } : {}),
          ...('cost_code_display' in patch ? { cost_code_display: patch.cost_code_display } : {}),
          ...('memo' in patch ? { memo: patch.memo } : {}),
          ...('purchase_order_id' in patch ? { purchase_order_id: patch.purchase_order_id } : {}),
          ...('purchase_order_line_id' in patch ? { purchase_order_line_id: patch.purchase_order_line_id } : {}),
          ...('po_assignment' in patch ? { po_assignment: patch.po_assignment ?? null } : {}),
          ...('poConfidence' in patch ? { poConfidence: patch.poConfidence } : {}),
          unit_cost: newUnit,
          quantity: childQty,
          amount: childAmt,
        };
      });
    });
  };

  const removeJobCostGroup = (group: DisplayLine) => {
    const ids = group.children.map((c) => c.id);
    setJobCostLines((prev) => prev.filter((l) => !ids.includes(l.id)));
    for (const id of ids) {
      if (!id.startsWith('new-')) {
        deleteLine.mutate(id);
      }
    }
  };

  const lotNameById = (lotId: string) => {
    const lot = lots.find((l) => l.id === lotId);
    return lot ? (lot.lot_name || `Lot ${lot.lot_number}`) : 'Lot';
  };


  const handleSave = async () => {
    if (!vendorId) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    // Validate that we have line items
    const allLines = [...jobCostLines, ...expenseLines];
    if (allLines.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one line item is required",
        variant: "destructive",
      });
      return;
    }

    // Calculate and validate total
    const calculatedTotal = parseFloat(calculateTotal());
    if (calculatedTotal <= 0) {
      toast({
        title: "Validation Error",
        description: "Bill total must be greater than $0.00 - please verify line item amounts",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate reference number (per-vendor uniqueness)
    if (refNo.trim() && vendorId) {
      const { isDuplicate, existingBill } = await checkDuplicate(refNo, vendorId);
      if (isDuplicate && existingBill) {
        toast({
          title: "Duplicate Invoice Number",
          description: `Invoice #${refNo} already exists for this vendor on project ${existingBill.projectName} (dated ${existingBill.billDate}).`,
          variant: "destructive",
        });
        return;
      }
    }

    // Get current bill to check if vendor changed
    const currentBill = pendingBills?.find(b => b.id === pendingUploadId);
    const originalVendorId = currentBill?.extracted_data?.vendor_id || currentBill?.extracted_data?.vendorId;
    const originalVendorName = currentBill?.extracted_data?.vendor_name || currentBill?.extracted_data?.vendor;

    // Query vendor name
    const { data: vendorData } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', vendorId)
      .single();

    // Update pending bill with basic info - save dates as YYYY-MM-DD (both naming conventions)
    const billDateStr = normalizeToYMD(billDate);
    const dueDateStr = dueDate ? normalizeToYMD(dueDate) : null;
    
    // Build PO overrides map: line_id → purchase_order_id (preserving __none__ sentinel)
    const poOverrides: Record<string, string> = {};
    for (const line of allLines) {
      if (line.purchase_order_id) {
        poOverrides[line.id] = line.purchase_order_id;
      } else {
        // Explicitly mark as no PO if user hasn't set one
        poOverrides[line.id] = '__none__';
      }
    }

    await supabase
      .from('pending_bill_uploads')
      .update({
        extracted_data: {
          vendorId,
          vendor_id: vendorId,
          vendor_name: vendorData?.company_name || '',
          bill_date: billDateStr,
          billDate: billDateStr,
          due_date: dueDateStr,
          dueDate: dueDateStr,
          referenceNumber: refNo,
          reference_number: refNo,
          terms,
          total_amount: calculatedTotal,
          totalAmount: calculatedTotal,
          notes: internalNotes || null,
          user_edited: true,
          po_overrides: poOverrides,
        },
      })
      .eq('id', pendingUploadId);

    // Save all lines with display names
    for (const line of allLines) {
      // Ensure amount is calculated correctly
      const lineAmount = line.amount || ((line.quantity || 0) * (line.unit_cost || 0));
      // Query display names for this line
      let accountName = '';
      let costCodeName = '';
      let projectName = '';

      if (line.account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('code, name')
          .eq('id', line.account_id)
          .single();
        accountName = accountData ? `${accountData.code}: ${accountData.name}` : '';
      }

      if (line.cost_code_id) {
        const { data: costCodeData } = await supabase
          .from('cost_codes')
          .select('code, name')
          .eq('id', line.cost_code_id)
          .single();
        costCodeName = costCodeData ? `${costCodeData.code}: ${costCodeData.name}` : '';
      }

      // Determine PO assignment intent:
      //   'none' = explicit "No purchase order"
      //   'auto' = matched by the auto-matcher (not user-confirmed)
      //   null   = explicit user pick of a real PO (highest signal)
      // Sentinels never round-trip into the UUID column.
      let poAssignment: 'none' | 'auto' | null;
      if (line.purchase_order_id === '__none__' || line.po_assignment === 'none') {
        poAssignment = 'none';
      } else if (userTouchedPoLineIds.current.has(line.id) && line.purchase_order_id) {
        // User manually picked a real PO this session — explicit pick.
        poAssignment = null;
      } else if (line.purchase_order_id) {
        // PO present but not user-touched — preserve auto flag (or set if missing).
        poAssignment = line.po_assignment === null ? null : 'auto';
      } else {
        poAssignment = null;
      }
      const realPoId = sanitizePoId(line.purchase_order_id);

      if (line.id.startsWith('new-')) {
        // Add new line
        await addLine.mutateAsync({
          pendingUploadId,
          lineData: {
            line_number: 1,
            line_type: line.line_type as 'expense' | 'job_cost',
            account_id: line.account_id,
            account_name: accountName,
            cost_code_id: line.cost_code_id,
            cost_code_name: costCodeName,
            purchase_order_id: realPoId,
            purchase_order_line_id: line.purchase_order_line_id || undefined,
            lot_id: line.lot_id,
            quantity: line.quantity || 1,
            unit_cost: line.unit_cost || 0,
            amount: lineAmount,
            memo: line.memo,
            po_assignment: poAssignment,
          } as any,
        });
      } else {
        // Update existing line
        await updateLine.mutateAsync({
          lineId: line.id,
          updates: {
            line_type: line.line_type as 'expense' | 'job_cost',
            account_id: line.account_id,
            account_name: accountName,
            cost_code_id: line.cost_code_id,
            cost_code_name: costCodeName,
            purchase_order_id: realPoId,
            purchase_order_line_id: line.purchase_order_line_id || undefined,
            lot_id: line.lot_id,
            quantity: line.quantity || 1,
            unit_cost: line.unit_cost || 0,
            amount: lineAmount,
            memo: line.memo,
            po_assignment: poAssignment,
          } as any,
        });
      }
    }

    // Save vendor alias if vendor was changed
    if (originalVendorId !== vendorId && originalVendorName && originalVendorName.trim()) {
      try {
        // Normalize the alias
        const normalizedAlias = String(originalVendorName)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '')
          .trim();
        
        // Get current user to determine owner_id
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get effective owner ID (owner or home_builder_id if employee)
          const { data: userData } = await supabase
            .from('users')
            .select('role, home_builder_id')
            .eq('id', user.id)
            .single();
          
          const effectiveOwnerId = (userData?.role === 'employee' && userData?.home_builder_id)
            ? userData.home_builder_id
            : user.id;
          
          // Upsert the alias (idempotent - won't fail if already exists)
          const { error: aliasError } = await supabase
            .from('vendor_aliases')
            .upsert({
              owner_id: effectiveOwnerId,
              company_id: vendorId,
              alias: String(originalVendorName).trim(),
              normalized_alias: normalizedAlias,
            }, {
              onConflict: 'owner_id,normalized_alias'
            });
          
          if (aliasError) {
            console.error('Failed to save vendor alias:', aliasError);
          } else {
            console.log(`Saved vendor alias: "${originalVendorName}" → ${vendorData?.company_name || 'selected vendor'}`);
          }
        }
      } catch (err) {
        console.error('Error saving vendor alias:', err);
      }
    }

    toast({
      title: "Bill Saved",
      description: `${vendorData?.company_name || 'Bill'} - $${calculatedTotal.toFixed(2)} with ${allLines.length} line item(s)`,
    });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-8" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit Extracted Bill</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto overflow-x-visible flex-1 px-2">
          {/* Header Info */}
          {/* Row 1: Vendor | Bill Date | Terms */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 min-w-0">
              <Label>Vendor *</Label>
              <VendorSearchInput value={vendorId} onChange={setVendorId} />
            </div>
            <div className="space-y-2">
              <Label>Bill Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Terms</Label>
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net-15">Net 15</SelectItem>
                  <SelectItem value="net-30">Net 30</SelectItem>
                  <SelectItem value="net-60">Net 60</SelectItem>
                  <SelectItem value="due-on-receipt">On Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Due Date | Reference No. | [Attachments + Internal Notes 50/50] */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setIsDueAuto(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reference No.</Label>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} />
            </div>

            {/* Third column: Attachments (left 50%) + Internal Notes (right 50%) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Attachments */}
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex items-center flex-wrap gap-1">
                  {attachments.map((attachment) => {
                    const IconComponent = getFileIcon(attachment.file_name);
                    return (
                      <div key={attachment.id} className="relative group shrink-0">
                        <button
                          onClick={() => openBillAttachment(attachment.file_path, attachment.file_name)}
                          className={`${getFileIconColor(attachment.file_name)} transition-colors p-1 rounded hover:bg-muted/50`}
                          title={getCleanFileName(attachment.file_name)}
                          type="button"
                        >
                          <IconComponent className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (attachment.id !== 'legacy') {
                              handleRemoveAttachment(attachment);
                            }
                          }}
                          className="absolute -top-1 -right-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
                          title="Remove attachment"
                          type="button"
                        >
                          <span className="text-xs font-bold leading-none">×</span>
                        </button>
                      </div>
                    );
                  })}
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => document.getElementById('edit-extracted-bill-file-input')?.click()}
                    className="flex-1 h-10 text-sm min-w-[80px]"
                    disabled={isUploadingFile}
                  >
                    {isUploadingFile ? 'Uploading...' : 'Add Files'}
                  </Button>
                  <input
                    id="edit-extracted-bill-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0 || !pendingUploadId) return;
                      setIsUploadingFile(true);
                      const newAttachments: Array<{ id: string; file_name: string; file_path: string }> = [];
                      const { data: { user } } = await supabase.auth.getUser();
                      for (const file of files) {
                        if (file.size > 20 * 1024 * 1024) {
                          toast({ title: "File too large", description: `${file.name} exceeds 20MB.`, variant: "destructive" });
                          continue;
                        }
                        try {
                          const timestamp = Date.now();
                          const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '_').replace(/_+/g, '_');
                          const newFilePath = `${pendingUploadId}/${timestamp}_${sanitizedName}`;
                          const { error: uploadError } = await supabase.storage.from('bill-attachments').upload(newFilePath, file);
                          if (uploadError) throw uploadError;
                          const { data: row, error: dbError } = await supabase
                            .from('bill_attachments')
                            .insert({
                              pending_upload_id: pendingUploadId,
                              bill_id: null,
                              file_name: file.name,
                              file_path: newFilePath,
                              file_size: file.size,
                              content_type: file.type,
                              uploaded_by: user?.id,
                            })
                            .select('id, file_name, file_path')
                            .single();
                          if (dbError) throw dbError;
                          if (row) newAttachments.push(row as { id: string; file_name: string; file_path: string });
                        } catch (err: any) {
                          toast({ title: "Upload failed", description: `${file.name}: ${err.message}`, variant: "destructive" });
                        }
                      }
                      if (newAttachments.length > 0) {
                        setAttachments(prev => [...prev.filter(a => a.id !== 'legacy'), ...newAttachments]);
                        toast({ title: "Files added", description: `${newAttachments.length} file(s) uploaded successfully.` });
                      }
                      setIsUploadingFile(false);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10"
                  onClick={() => setNotesDialogOpen(true)}
                >
                  {internalNotes.trim() ? (
                    <>
                      <StickyNote className="h-4 w-4 mr-2 text-yellow-600" />
                      View Notes
                    </>
                  ) : (
                    "Add Internal Notes"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between border-b">
              <TabsList>
                <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
              </TabsList>
              <Button 
                onClick={activeTab === 'job-cost' ? addJobCostLine : addExpenseLine} 
                variant="outline" 
                size="sm"
                className="mb-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <TabsContent value="job-cost" className="space-y-4 mt-8">
              {jobCostLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job cost lines. Click "Add Line" to add one.
                </div>
              ) : (
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table containerClassName="relative w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Cost Code</TableHead>
                      <TableHead className="w-[220px]">Description</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[100px]">Unit Cost</TableHead>
                      <TableHead className="w-[80px]">Total</TableHead>
                      {showAddressColumn && <TableHead className="w-[130px]">Address</TableHead>}
                      {showPOSelection && <TableHead className="w-[180px]">Purchase Order</TableHead>}
                      {showPOSelection && <TableHead className="w-[55px] text-center">Match</TableHead>}
                      <TableHead className="w-[50px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobCostLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                         <CostCodeSearchInput
                          value={line.cost_code_display || ""}
                          onChange={(value) => updateJobCostLine(line.id, 'cost_code_display', value)}
                          className="h-8"
                          onCostCodeSelect={(costCode) => {
                            if (costCode) {
                              const display = `${costCode.code} - ${costCode.name}`;
                              setJobCostLines(lines =>
                                lines.map(l => 
                                  l.id === line.id 
                                    ? { ...l, cost_code_id: costCode.id, cost_code_display: display }
                                    : l
                                )
                              );
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                         <Input
                          className="h-8"
                          value={line.memo || ""}
                          onChange={(e) => updateJobCostLine(line.id, 'memo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateJobCostLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(e) => updateJobCostLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${line.amount.toFixed(2)}</span>
                      </TableCell>
                      {showAddressColumn && (
                        <TableCell>
                          <Select
                            value={line.lot_id || ''}
                            onValueChange={(value) => updateJobCostLine(line.id, 'lot_id', value)}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {lots.map((lot) => (
                                <SelectItem key={lot.id} value={lot.id}>
                                  {lot.lot_name || `Lot ${lot.lot_number}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {showPOSelection && (
                        <TableCell>
                          <POSelectionDropdown
                            projectId={projectId}
                            vendorId={vendorId}
                            value={line.purchase_order_id}
                            purchaseOrderLineId={line.purchase_order_line_id}
                            onChange={(poId, poLineId) => {
                              // User explicitly touched this line — auto-matcher must NEVER overwrite it.
                              userTouchedPoLineIds.current.add(line.id);
                              autoMatchedLineIds.current.add(line.id);
                              const newAssignment: 'none' | 'auto' | null =
                                poId === '__none__' ? 'none' : null;
                              setJobCostLines(lines =>
                                lines.map(l =>
                                  l.id === line.id
                                    ? {
                                        ...l,
                                        purchase_order_id: poId,
                                        purchase_order_line_id: poLineId,
                                        po_assignment: newAssignment,
                                        poConfidence: undefined,
                                      }
                                    : l
                                )
                              );
                            }}
                            costCodeId={line.cost_code_id}
                            currentBillId={undefined}
                            currentBillAmount={jobCostLines.reduce((sum, l) => sum + l.amount, 0)}
                            currentBillReference={refNo}
                            pendingBillLines={
                              line.purchase_order_id
                                ? jobCostLines
                                    .filter(l => l.purchase_order_id === line.purchase_order_id)
                                    .map(l => ({
                                      purchase_order_line_id: l.purchase_order_line_id || undefined,
                                      cost_code_id: l.cost_code_id || undefined,
                                      amount: l.amount,
                                    }))
                                : undefined
                            }
                          />
                        </TableCell>
                      )}
                      {showPOSelection && (
                        <TableCell className="text-center">
                          {line.poConfidence !== undefined && line.poConfidence > 0 && line.purchase_order_id ? (
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap",
                              line.poConfidence >= 80 ? "bg-green-100 text-green-700" :
                              line.poConfidence >= 50 ? "bg-yellow-100 text-yellow-700" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {line.poConfidence}%
                            </span>
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJobCostLine(line.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              )}
            </TabsContent>

            <TabsContent value="expense" className="space-y-4 mt-8">
              {expenseLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expense lines. Click "Add Line" to add one.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <Table containerClassName="relative w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="w-[120px]">Unit Cost</TableHead>
                      <TableHead className="w-[120px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <AccountSearchInput
                          value={line.account_display || ""}
                          onChange={(value) => updateExpenseLine(line.id, 'account_display', value)}
                          onAccountSelect={(account) => {
                            if (account) {
                              const display = `${account.code} - ${account.name}`;
                              setExpenseLines(lines =>
                                lines.map(l => 
                                  l.id === line.id 
                                    ? { ...l, account_id: account.id, account_display: display }
                                    : l
                                )
                              );
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={line.memo || ""}
                          onChange={(e) => updateExpenseLine(line.id, 'memo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateExpenseLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(e) => updateExpenseLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${line.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpenseLine(line.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Total */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(parseFloat(calculateTotal()))}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <BillNotesDialog
      open={notesDialogOpen}
      onOpenChange={setNotesDialogOpen}
      billInfo={{
        vendor: '',
        amount: 0,
      }}
      initialValue={internalNotes}
      onSave={(notes) => setInternalNotes(notes)}
    />
    </>
  );
}
