import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLots } from "@/hooks/useLots";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText, Loader2, Plus } from "lucide-react";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { cn } from "@/lib/utils";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import { EditExtractedBillDialog } from "./EditExtractedBillDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { POStatusBadge } from "./POStatusBadge";
import { BillPOSummaryDialog } from "./BillPOSummaryDialog";
import { useBillPOMatching, POMatch } from "@/hooks/useBillPOMatching";
import { getBillCostCodeDisplay } from "@/lib/billListDisplay";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Helper function to format terms for display
const formatTerms = (terms: string | null | undefined): string => {
  if (!terms) return '-';
  const termsStr = String(terms).toLowerCase().trim();
  
  if (termsStr.includes('due') && termsStr.includes('receipt')) {
    return 'On Receipt';
  }
  
  const netMatch = termsStr.match(/net[\s-]*(\d+)/i);
  if (netMatch) {
    return `Net ${netMatch[1]}`;
  }
  
  return terms;
};

// Normalize terms from any format to standardized dropdown values (matches EditExtractedBillDialog)
function normalizeTermsForUI(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
    return terms;
  }
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes('15')) return 'net-15';
  if (normalized.includes('60')) return 'net-60';
  if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
  return 'net-30';
}

// Compute due date from bill date and terms (matches EditExtractedBillDialog)
function computeDueDate(billDate: Date, terms: string): Date {
  const result = new Date(billDate);
  switch (terms) {
    case 'net-15': result.setDate(result.getDate() + 15); break;
    case 'net-30': result.setDate(result.getDate() + 30); break;
    case 'net-60': result.setDate(result.getDate() + 60); break;
    case 'due-on-receipt': break; // same day
    default: result.setDate(result.getDate() + 30);
  }
  return result;
}

interface PendingBillLine {
  line_number: number;
  line_type: string;
  account_id?: string;
  account_name?: string;
  cost_code_id?: string;
  cost_code_name?: string;
  project_id?: string;
  project_name?: string;
  quantity?: number;
  unit_cost?: number;
  amount: number;
  memo?: string;
  description?: string;
  lot_id?: string;
  lot_name?: string;
  purchase_order_id?: string;
  purchase_order_line_id?: string;
  po_reference?: string | null;
  po_assignment?: string | null;
}

interface PendingBill {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  extracted_data?: any;
  vendor_id?: string;
  vendor_name?: string;
  bill_date?: string;
  due_date?: string;
  reference_number?: string;
  terms?: string;
  lines?: PendingBillLine[];
  attachments?: Array<{ id: string; file_name: string; file_path: string }>;
}

interface ProcessingUpload {
  id: string;
  file_name: string;
  status: 'pending' | 'processing';
}

interface ExtractionProgress {
  uploadId: string;
  fileName: string;
  progress: number;
  status: 'processing' | 'complete' | 'error';
}

interface BatchBillReviewTableProps {
  bills: PendingBill[];
  onBillUpdate: (billId: string, updates: Partial<PendingBill>) => void;
  onBillDelete: (billId: string) => void;
  onLinesUpdate: (billId: string, lines: PendingBillLine[]) => void;
  selectedBillIds: Set<string>;
  onBillSelect: (billId: string) => void;
  onSelectAll: (selectAll: boolean) => void;
  showProjectColumn?: boolean;
  projectId?: string;
}

export function BatchBillReviewTable({ 
  bills,
  onBillUpdate, 
  onBillDelete,
  onLinesUpdate,
  selectedBillIds,
  onBillSelect,
  onSelectAll,
  showProjectColumn = true,
  projectId,
}: BatchBillReviewTableProps) {
  const { lots } = useLots(projectId);
  const showAddressColumn = lots.length > 1;
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [addingVendorForBillId, setAddingVendorForBillId] = useState<string | null>(null);
  const [addingVendorName, setAddingVendorName] = useState<string>("");
  const [rematchingBillId, setRematchingBillId] = useState<string | null>(null);
  const [poDialogState, setPoDialogState] = useState<{
    open: boolean;
    matches: POMatch[];
    bill: any | null;
  }>({ open: false, matches: [], bill: null });
  const [vendorInitialData, setVendorInitialData] = useState<{
    phone_number?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    website?: string;
  } | undefined>(undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openBillAttachment } = useUniversalFilePreviewContext();
  const [deletingAttachmentBill, setDeletingAttachmentBill] = useState<PendingBill | null>(null);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  // Track which (billId|projectId) pairs we've already requested a PO snap for,
  // so we don't spam the edge function on every render.
  const [snappedKeys] = useState<Set<string>>(() => new Set());

  // NOTE: The post-render PO auto-snap previously lived here. It caused a visible
  // flicker (e.g. "4000 → 4275") because the table was already mounted when the
  // edge function returned and re-wrote the cost code. The parent BillsApprovalTabs
  // now runs `rematch-pending-bill` and re-reads lines BEFORE rendering this
  // table during a fresh ML upload, so the final cost codes are present on first
  // paint. Manual rematch (handleRematchVendor) and edit-dialog refresh paths
  // are preserved below and remain user-initiated.

  const handleRemoveAttachment = async (bill: PendingBill, att: { id: string; file_name: string; file_path: string }) => {
    try {
      await supabase.storage.from('bill-attachments').remove([att.file_path]);
      await supabase.from('bill_attachments').delete().eq('id', att.id);
      onBillUpdate(bill.id, {
        attachments: (bill.attachments || []).filter(a => a.id !== att.id)
      });
      toast({ title: "Attachment removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deletingAttachmentBill) return;
    setIsDeletingAttachment(true);
    try {
      if (deletingAttachmentBill.file_path) {
        await supabase.storage.from('bill-attachments').remove([deletingAttachmentBill.file_path]);
      }
      const { error } = await supabase
        .from('pending_bill_uploads')
        .update({ file_name: '', file_path: '' })
        .eq('id', deletingAttachmentBill.id);
      if (error) throw error;
      onBillUpdate(deletingAttachmentBill.id, { file_name: '', file_path: '' });
      toast({ title: "Attachment removed", description: "The file was deleted. The bill and its line items remain in the queue." });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to remove attachment: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeletingAttachment(false);
      setDeletingAttachmentBill(null);
    }
  };

  // Build billsForMatching in the same shape used by the other tabs (BillsApprovalTable / PayBillsTable).
  // This drives row clickability, the PO badge status, and the dialog matches via useBillPOMatching.
  // CRITICAL: pending_bill_lines is the single source of truth — only fall back to extracted_data
  // total_amount when no saved lines exist yet.
  const billsForMatching = useMemo(() => {
    return bills.map(b => {
      const vendorId = (b.vendor_id || b.extracted_data?.vendor_id || b.extracted_data?.vendorId) as string | undefined;
      const ext = b.extracted_data;
      const lineSum = b.lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0;
      const extTotal = ext?.total_amount || ext?.totalAmount;
      const totalAmount = (b.lines && b.lines.length > 0)
        ? lineSum
        : (extTotal ? (typeof extTotal === 'string' ? parseFloat(extTotal) : extTotal) : 0);
      const extLineItems: any[] = Array.isArray(ext?.line_items) ? ext.line_items : [];
      return {
        id: b.id,
        vendor_id: vendorId || '',
        project_id: projectId,
        total_amount: totalAmount,
        status: 'draft',
        bill_lines: (b.lines || []).map((l, idx) => ({
          cost_code_id: l.cost_code_id,
          cost_code_display: l.cost_code_name,
          amount: l.amount,
          // Translate persisted "po_assignment = 'none'" back into the UI sentinel
          // so the matcher and summary dialog honor the explicit "No PO" intent.
          purchase_order_id: l.po_assignment === 'none' ? '__none__' : l.purchase_order_id,
          purchase_order_line_id: l.purchase_order_line_id,
          po_reference: l.po_reference || extLineItems[idx]?.po_reference || null,
          po_assignment: l.po_assignment || null,
          memo: l.memo,
        })),
      };
    });
  }, [bills, projectId]);

  const { data: poMatchingData } = useBillPOMatching(billsForMatching);

  // Helper to get extracted values (handles both snake_case and camelCase)
  const getExtractedValue = (bill: PendingBill, snakeCase: string, camelCase: string) => {
    // First check root level for backward compatibility
    if (bill[snakeCase as keyof PendingBill]) return bill[snakeCase as keyof PendingBill];
    // Then check extracted_data with both naming conventions
    if (!bill.extracted_data) return null;
    return bill.extracted_data[snakeCase] || bill.extracted_data[camelCase];
  };

  const validateBill = (bill: PendingBill) => {
    const issues: string[] = [];
    
    // Enhanced vendor validation
    const hasVendorName = bill.vendor_name || getExtractedValue(bill, 'vendor_name', 'vendor');
    const hasVendorId = bill.vendor_id || getExtractedValue(bill, 'vendor_id', 'vendorId');
    
    // Debug logging for vendor detection
    console.debug('Vendor check:', { 
      billId: bill.id, 
      vendorName: hasVendorName, 
      vendorId: hasVendorId 
    });
    
    if (!hasVendorId) {
      if (!hasVendorName) {
        issues.push("Vendor required");
      } else {
        issues.push("Vendor not in database");
      }
    }
    
    const billDate = getExtractedValue(bill, 'bill_date', 'billDate');
    if (!billDate) issues.push("Bill date required");
    if (!bill.lines || bill.lines.length === 0) issues.push("At least one line item required");
    
    // Check line items
    bill.lines?.forEach((line, idx) => {
      if (line.line_type === 'expense' && !line.account_id) {
        issues.push(`Line ${idx + 1}: Account required`);
      }
      if (line.line_type === 'job_cost' && !line.cost_code_id) {
        issues.push(`Line ${idx + 1}: Cost code required`);
      }
    });
    
    return issues;
  };

  const parseUSAddress = (addressStr: string) => {
    // Normalize: replace newlines with spaces, collapse multiple spaces
    const normalized = addressStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check for suite/unit/apt patterns and extract to address_line_2
    const suitePattern = /\b(suite|ste|unit|apt|apartment|#)\s+([^\s,]+)/i;
    const suiteMatch = normalized.match(suitePattern);
    let address_line_2: string | undefined;
    let cleanedAddress = normalized;
    
    if (suiteMatch) {
      address_line_2 = suiteMatch[0].trim(); // e.g., "Suite 200"
      cleanedAddress = normalized.replace(suiteMatch[0], '').replace(/\s+/g, ' ').trim();
    }
    
    // Try to extract state and zip using regex (handles various formats)
    const stateZipMatch = cleanedAddress.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
    
    if (stateZipMatch) {
      const state = stateZipMatch[1];
      const zip = stateZipMatch[2];
      const beforeStateZip = cleanedAddress.substring(0, stateZipMatch.index).trim();
      
      // Check if there are commas (traditional format)
      if (beforeStateZip.includes(',')) {
        const parts = beforeStateZip.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          return {
            address_line_1: parts[0],
            address_line_2,
            city: parts[parts.length - 1],
            state,
            zip_code: zip,
          };
        } else if (parts.length === 1) {
          return {
            address_line_1: parts[0],
            address_line_2,
            state,
            zip_code: zip,
          };
        }
      } else {
        // No commas - try to extract city as the word(s) before state
        // Pattern: "123 Main St SomeCity ST ZIP"
        const cityMatch = beforeStateZip.match(/^(.+)\s+([A-Za-z\s]+)$/);
        if (cityMatch) {
          return {
            address_line_1: cityMatch[1].trim(),
            address_line_2,
            city: cityMatch[2].trim(),
            state,
            zip_code: zip,
          };
        } else {
          return {
            address_line_1: beforeStateZip,
            address_line_2,
            state,
            zip_code: zip,
          };
        }
      }
    }
    
    // Fallback: no state/zip found, try comma-separated
    if (cleanedAddress.includes(',')) {
      const parts = cleanedAddress.split(',').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        return {
          address_line_1: parts[0],
          address_line_2,
          city: parts[1],
        };
      }
    }
    
    // Ultimate fallback: just use as address line 1
    return {
      address_line_1: cleanedAddress,
      address_line_2,
    };
  };

  const handleAddVendor = async (billId: string, vendorName: string) => {
    // Find the bill to extract vendor data
    const bill = bills.find(b => b.id === billId);
    
    // Helper to get contact info with flexible key checking
    const getContact = (data: any, snakeKey: string, camelKey: string) => {
      return data?.[snakeKey] || data?.[camelKey];
    };
    
    if (bill) {
      const data = bill.extracted_data as any;
      
      // Try to get contact info from extracted_data
      let vendorAddress = getContact(data, 'vendor_address', 'vendorAddress');
      let vendorPhone = getContact(data, 'vendor_phone', 'vendorPhone');
      let vendorWebsite = getContact(data, 'vendor_website', 'vendorWebsite');
      
      // Note: Opening dialog with existing extracted data (if any)
      
      // Parse address if available
      let addressData = {};
      if (vendorAddress) {
        addressData = parseUSAddress(vendorAddress as string);
      }
      
      const initialData = {
        phone_number: vendorPhone || undefined,
        website: vendorWebsite || undefined,
        ...addressData,
      };
      
      console.debug('Setting vendor initial data:', initialData);
      setVendorInitialData(initialData);
    } else {
      setVendorInitialData(undefined);
    }
    
    setAddingVendorForBillId(billId);
    // Normalize vendor name: replace newlines/multiple spaces with single space
    setAddingVendorName(String(vendorName).replace(/\s+/g, ' ').trim());
  };

  const handleRematchVendor = async (billId: string) => {
    setRematchingBillId(billId);
    
    try {
      const { data, error } = await supabase.functions.invoke('rematch-pending-bill', {
        body: { pendingUploadId: billId, projectId: projectId || null }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.vendor_id && data?.company_name) {
        onBillUpdate(billId, {
          vendor_id: data.vendor_id,
          vendor_name: data.company_name
        });
        
        toast({
          title: "Vendor matched",
          description: `Matched to ${data.company_name}`,
        });
      } else {
        toast({
          title: "No match found",
          description: "Could not find a matching vendor in your database.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Rematch error:', error);
      toast({
        title: "Error",
        description: "Failed to rematch vendor",
        variant: "destructive",
      });
    } finally {
      setRematchingBillId(null);
    }
  };

  const handleVendorCreated = async (companyId: string, companyName: string) => {
    if (addingVendorForBillId) {
      onBillUpdate(addingVendorForBillId, {
        vendor_id: companyId,
        vendor_name: companyName
      });
      
      // Save vendor alias for future recognition
      const bill = bills.find(b => b.id === addingVendorForBillId);
      const originalVendorName = bill?.extracted_data?.vendor_name || bill?.extracted_data?.vendor || addingVendorName;
      
      if (originalVendorName && originalVendorName.trim()) {
        try {
          // Normalize the alias
          const normalizedAlias = originalVendorName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '')
            .trim();
          
          // Get current user to determine owner_id
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No authenticated user for alias save');
            return;
          }
          
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
              company_id: companyId,
              alias: originalVendorName.trim(),
              normalized_alias: normalizedAlias,
            }, {
              onConflict: 'owner_id,normalized_alias'
            });
          
          if (aliasError) {
            console.error('Failed to save vendor alias:', aliasError);
          } else {
            console.log(`Saved vendor alias: "${originalVendorName}" → ${companyName}`);
          }
        } catch (err) {
          console.error('Error saving vendor alias:', err);
        }
      }
      
      toast({
        title: "Vendor added",
        description: `${companyName} has been added and linked to the bill.`,
      });
    }
    
    setAddingVendorForBillId(null);
    setAddingVendorName("");
  };



  const allSelected = bills.length > 0 && bills.every(bill => selectedBillIds.has(bill.id));
  const someSelected = bills.some(bill => selectedBillIds.has(bill.id)) && !allSelected;

  // Helper to get memo summary from pending bill lines (one row per unique description)
  const getMemoSummary = (bill: PendingBill): string[] | null => {
    if (!bill.lines || bill.lines.length === 0) return null;
    
    const memos = bill.lines
      .map(line => line.memo?.trim() || line.description?.trim())
      .filter((memo): memo is string => !!memo);
    
    if (memos.length === 0) return null;
    
    return [...new Set(memos)];
  };

  // Helper to get lot/address allocation data from pending bill lines
  const getLotAllocationData = (bill: PendingBill) => {
    if (!bill.lines || bill.lines.length === 0) {
      return { display: '-', breakdown: [], totalAmount: 0, uniqueLotCount: 0 };
    }
    
    // Group amounts by lot
    const lotMap = new Map<string, { name: string; amount: number }>();
    
    bill.lines.forEach(line => {
      if (line.lot_id && line.lot_name) {
        const existing = lotMap.get(line.lot_id);
        if (existing) {
          existing.amount += line.amount || 0;
        } else {
          lotMap.set(line.lot_id, { name: line.lot_name, amount: line.amount || 0 });
        }
      }
    });
    
    const naturalLotKey = (name: string) => {
      const m = name.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const breakdown = Array.from(lotMap.values()).sort((a, b) => naturalLotKey(a.name) - naturalLotKey(b.name) || a.name.localeCompare(b.name));
    const totalAmount = bill.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
    const uniqueLotCount = lotMap.size;
    
    if (uniqueLotCount === 0) return { display: '-', breakdown: [], totalAmount, uniqueLotCount: 0 };
    if (uniqueLotCount === 1) return { display: breakdown[0]?.name || '-', breakdown, totalAmount, uniqueLotCount: 1 };
    
    return { display: `+${uniqueLotCount}`, breakdown, totalAmount, uniqueLotCount };
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const emptyStateColSpan = 11 + (showProjectColumn ? 1 : 0) + (showAddressColumn ? 1 : 0);

  if (bills.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox disabled aria-label="Select all bills" />
              </TableHead>
              {showProjectColumn && (
                <TableHead className="w-44">Project</TableHead>
              )}
              <TableHead className="w-36">Vendor</TableHead>
              <TableHead className="w-44">Cost Code</TableHead>
              <TableHead className="w-24">Bill Date</TableHead>
              <TableHead className="w-24">Due Date</TableHead>
              <TableHead className="w-24">Amount</TableHead>
              <TableHead className="w-32">Reference</TableHead>
              <TableHead className="w-12 text-center">Description</TableHead>
              {showAddressColumn && <TableHead className="w-24">Address</TableHead>}
              <TableHead className="w-14 text-center">Files</TableHead>
              <TableHead className="w-20 text-center">PO Status</TableHead>
              <TableHead className="w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={emptyStateColSpan} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No bills uploaded yet</p>
                  <p className="text-xs mt-1">Upload PDF files above to extract bill data automatically</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el: any) => {
                    if (el) {
                      el.indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label="Select all bills"
                />
              </TableHead>
              {showProjectColumn && (
                <TableHead className="w-44">Project</TableHead>
              )}
              <TableHead className="w-36">Vendor</TableHead>
              <TableHead className="w-44">Cost Code</TableHead>
              <TableHead className="w-24">Bill Date</TableHead>
              <TableHead className="w-24">Due Date</TableHead>
              <TableHead className="w-24">Amount</TableHead>
              <TableHead className="w-32">Reference</TableHead>
              <TableHead className="w-12 text-center">Description</TableHead>
              {showAddressColumn && <TableHead className="w-24">Address</TableHead>}
              <TableHead className="w-14 text-center">Files</TableHead>
              <TableHead className="w-20 text-center">PO Status</TableHead>
              <TableHead className="w-20 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => {
              // Show spinner row for pending/processing bills
              if (bill.status === 'pending' || bill.status === 'processing') {
                return (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Checkbox disabled aria-label="Bill extracting" />
                    </TableCell>
                    <TableCell colSpan={9 + (showProjectColumn ? 1 : 0) + (showAddressColumn ? 1 : 0)}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Extracting: {bill.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onBillDelete(bill.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
              
              // SINGLE SOURCE OF TRUTH: when saved pending_bill_lines exist, the displayed
              // bill amount must equal the sum of those lines. Only fall back to extracted_data
              // total_amount when no rows have been saved yet (still extracting).
              const extractedTotal = getExtractedValue(bill, 'total_amount', 'totalAmount');
              const lineSum = bill.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0;
              const totalAmount = (bill.lines && bill.lines.length > 0)
                ? lineSum
                : (extractedTotal
                    ? (typeof extractedTotal === 'string' ? parseFloat(extractedTotal) : extractedTotal)
                    : 0);
              
              // Tooltip / cost-code breakdown: GROUP by unique cost code / account name
              // (mirrors the Address tooltip pattern). For a multi-lot split where every
              // line shares the same cost code, this collapses 19 rows into 1 summed row.
              const accountDisplayData = getBillCostCodeDisplay(
                (bill.lines || []).map((l) => ({
                  line_type: l.line_type,
                  amount: l.amount,
                  cost_code_name: l.cost_code_name,
                  account_name: l.account_name,
                })),
              );
              
              const vendorName = getExtractedValue(bill, 'vendor_name', 'vendor');
              const vendorId = bill.vendor_id || getExtractedValue(bill, 'vendor_id', 'vendorId');
              const referenceNumber = getExtractedValue(bill, 'reference_number', 'referenceNumber');
              const billDate = getExtractedValue(bill, 'bill_date', 'billDate');
              const memoSummary = getMemoSummary(bill);
              const lotAllocationData = getLotAllocationData(bill);
              
              // Compute due date display
              const getDueDateDisplay = () => {
                const rawDueDate = getExtractedValue(bill, 'due_date', 'dueDate') as string | null;
                if (rawDueDate) {
                  return formatDisplayFromAny(rawDueDate);
                }
                // Compute due date from bill date and terms (default Net 30)
                if (billDate) {
                  const rawTerms = getExtractedValue(bill, 'terms', 'terms') as string | null;
                  const computedTerms = normalizeTermsForUI(rawTerms);
                  const billDateObj = new Date(billDate as string);
                  const computedDueDate = computeDueDate(billDateObj, computedTerms);
                  return formatDisplayFromAny(computedDueDate.toISOString().split('T')[0]);
                }
                return '-';
              };
              
              const matchResult = poMatchingData?.get(bill.id);
              const rowAllMatches = matchResult?.matches || [];
              const poStatusForRow = matchResult?.overall_status || 'no_po';
              const rowClickable = rowAllMatches.length > 0;

              const buildDialogBill = () => {
                const vendorIdLocal = (bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId) as string | undefined;
                const ext = bill.extracted_data;
                const dialogLineSum = bill.lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0;
                const extTotal = ext?.total_amount || ext?.totalAmount;
                const dialogTotal = (bill.lines && bill.lines.length > 0)
                  ? dialogLineSum
                  : (extTotal ? (typeof extTotal === 'string' ? parseFloat(extTotal) : extTotal) : 0);
                return {
                  id: bill.id,
                  project_id: projectId || null,
                  vendor_id: vendorIdLocal,
                  total_amount: dialogTotal,
                  reference_number: bill.reference_number || ext?.reference_number || ext?.referenceNumber || null,
                  bill_date: ext?.bill_date || ext?.billDate || undefined,
                  status: 'draft',
                  // Pass full line metadata so the PO summary mirrors the editor exactly:
                  // cost_code_display, po_assignment, po_reference, and the __none__ sentinel.
                  bill_lines: (bill.lines || []).map((l, idx) => ({
                    cost_code_id: l.cost_code_id,
                    cost_code_display: l.cost_code_name,
                    amount: l.amount || 0,
                    purchase_order_id: l.po_assignment === 'none' ? '__none__' : l.purchase_order_id,
                    purchase_order_line_id: l.purchase_order_line_id,
                    po_reference: l.po_reference || ext?.line_items?.[idx]?.po_reference || null,
                    po_assignment: l.po_assignment || null,
                    memo: l.memo || l.description || undefined,
                  })),
                };
              };

              const handleRowClick = () => {
                if (!rowClickable) return;
                setPoDialogState({ open: true, matches: rowAllMatches, bill: buildDialogBill() });
              };

              return (
                <TableRow
                  key={bill.id}
                  onClick={rowClickable ? handleRowClick : undefined}
                  className={rowClickable ? "cursor-pointer hover:bg-muted/50" : undefined}
                >
                  {/* Checkbox */}
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedBillIds.has(bill.id)}
                      onCheckedChange={() => onBillSelect(bill.id)}
                      aria-label={`Select bill from ${vendorName}`}
                    />
                  </TableCell>
                  
                  {/* Project */}
                  {showProjectColumn && (
                    <TableCell className="w-44">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">
                              {bill.lines?.[0]?.project_name || '-'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{bill.lines?.[0]?.project_name || '-'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  
                  {/* Vendor */}
                  <TableCell className="w-36" onClick={(e) => { if (!vendorId && vendorName) e.stopPropagation(); }}>
                    {!vendorId && vendorName ? (
                      <div className="flex items-center gap-1">
                        <span className="text-destructive truncate max-w-20">{vendorName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 font-normal text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleRematchVendor(bill.id)}
                          disabled={rematchingBillId === bill.id}
                          title="Try to match vendor again"
                        >
                          {rematchingBillId === bill.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Re-match"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 font-normal text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleAddVendor(bill.id, vendorName as string)}
                          title="Add vendor to database"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{vendorName || '-'}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{vendorName || '-'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  
                  {/* Cost Code */}
                  <TableCell className="w-44">
                    {accountDisplayData.count === 0 ? (
                      <Badge variant="destructive" className="h-5">Missing</Badge>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">{accountDisplayData.display}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {accountDisplayData.count <= 1 ? (
                              <p>{accountDisplayData.display}</p>
                            ) : (
                              <div className="space-y-1">
                                {accountDisplayData.breakdown.map((item, i) => (
                                  <div key={i} className="flex justify-between gap-4 text-xs">
                                    <span>{item.name}</span>
                                    <span>${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                ))}
                                <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                                  <span>Total:</span>
                                  <span>${accountDisplayData.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  
                  {/* Bill Date */}
                  <TableCell className="w-24">
                    {billDate ? formatDisplayFromAny(billDate as string) : '-'}
                  </TableCell>
                  
                  {/* Due Date */}
                  <TableCell className="w-24">
                    {getDueDateDisplay()}
                  </TableCell>
                  
                  {/* Amount */}
                  <TableCell className="w-24">
                    {totalAmount > 0 ? (
                      <span>{formatCurrency(totalAmount)}</span>
                    ) : (
                      <Badge variant="destructive" className="h-5">Missing</Badge>
                    )}
                  </TableCell>
                  
                  {/* Reference */}
                  <TableCell className="w-32">
                    <span className="block truncate">{referenceNumber || '-'}</span>
                  </TableCell>
                  
                  {/* Memo */}
                  <TableCell className="w-12 text-center">
                    {memoSummary && memoSummary.length > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <FileText className="h-4 w-4 text-yellow-600 mx-auto cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {memoSummary.map((memo, i) => (
                                <p key={i} className="whitespace-nowrap text-xs">{memo}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  
                  {/* Address */}
                  {showAddressColumn && (
                  <TableCell className="w-24">
                    {lotAllocationData.uniqueLotCount > 1 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">{lotAllocationData.display}</span>
                          </TooltipTrigger>
                          <TooltipContent className="p-2">
                            <div className="space-y-1 text-xs">
                              {lotAllocationData.breakdown.map((lot, idx) => (
                                <div key={idx} className="flex justify-between gap-4">
                                  <span>{lot.name}</span>
                                  <span className="font-medium">{formatCurrency(lot.amount)}</span>
                                </div>
                              ))}
                              <div className="border-t pt-1 mt-1 flex justify-between gap-4 font-semibold">
                                <span>Total</span>
                                <span>{formatCurrency(lotAllocationData.totalAmount)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      lotAllocationData.display
                    )}
                  </TableCell>
                  )}
                  
                  {/* Files */}
                  <TableCell className="w-14 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {(bill.attachments || []).slice(0, 3).map(att => {
                        const IconComponent = getFileIcon(att.file_name);
                        return (
                          <div key={att.id} className="relative group shrink-0">
                            <button
                              onClick={() => openBillAttachment(att.file_path, att.file_name)}
                              className={`${getFileIconColor(att.file_name)} transition-colors p-1`}
                              title={att.file_name}
                              type="button"
                            >
                              <IconComponent className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAttachment(bill, att);
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
                      {(bill.attachments?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground">+{bill.attachments!.length - 3}</span>
                      )}
                      {(!bill.attachments || bill.attachments.length === 0) && bill.file_name && (
                        <button
                          onClick={() => {
                            const displayName = bill.file_name.split('/').pop() || bill.file_name;
                            openBillAttachment(bill.file_path, displayName);
                          }}
                          className={`${getFileIconColor(bill.file_name)} transition-colors p-1`}
                          title={bill.file_name}
                          type="button"
                        >
                          {(() => {
                            const IconComponent = getFileIcon(bill.file_name);
                            return <IconComponent className="h-4 w-4" />;
                          })()}
                        </button>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* PO Status */}
                  <TableCell className="w-20 text-center" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const status = poStatusForRow;
                      return (
                        <POStatusBadge
                          status={status}
                          onClick={rowAllMatches.length > 0 ? (e?: any) => {
                            e?.stopPropagation?.();
                            setPoDialogState({ open: true, matches: rowAllMatches, bill: buildDialogBill() });
                          } : undefined}
                        />
                      );
                    })()}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="w-20 text-center" onClick={(e) => e.stopPropagation()}>
                    <TableRowActions actions={[
                      { label: "Edit", onClick: () => setEditingBillId(bill.id) },
                      { label: "Delete", onClick: () => onBillDelete(bill.id), variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Bill", confirmDescription: "Are you sure you want to delete this extracted bill? This action cannot be undone." },
                    ]} />
                  </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
      
      {editingBillId && (
        <EditExtractedBillDialog
          open={!!editingBillId}
          onOpenChange={async (open) => {
            if (!open) {
              // Re-fetch lines and attachments for this bill
              const closingBillId = editingBillId;
              setEditingBillId(null);
              try {
                const [linesResult, attachmentsResult] = await Promise.all([
                  supabase
                    .from('pending_bill_lines')
                    .select('*, project_lots(id, lot_number, lot_name)')
                    .eq('pending_upload_id', closingBillId)
                    .order('line_number'),
                  supabase
                    .from('bill_attachments')
                    .select('id, file_name, file_path')
                    .eq('pending_upload_id', closingBillId),
                ]);
                
                if (linesResult.data) {
                  const processedLines = linesResult.data.map((line: any) => ({
                    ...line,
                    lot_name: line.project_lots?.lot_name || 
                              (line.project_lots ? `Lot ${line.project_lots.lot_number}` : null),
                  }));
                  onLinesUpdate(closingBillId, processedLines);
                }
                onBillUpdate(closingBillId, {
                  attachments: attachmentsResult.data || [],
                });
              } catch (err) {
                console.error('Failed to refresh lines/attachments after edit:', err);
              }
            }
          }}
          pendingUploadId={editingBillId}
        />
      )}

      {addingVendorForBillId && (
        <AddCompanyDialog
          open={!!addingVendorForBillId}
          onOpenChange={(open) => {
            if (!open) {
              setAddingVendorForBillId(null);
              setAddingVendorName("");
              setVendorInitialData(undefined);
            }
          }}
          initialCompanyName={addingVendorName}
          initialData={vendorInitialData}
          onCompanyCreated={handleVendorCreated}
        />
      )}

      <BillPOSummaryDialog
        open={poDialogState.open}
        onOpenChange={(open) => { if (!open) setPoDialogState({ open: false, matches: [], bill: null }); }}
        matches={poDialogState.matches}
        bill={poDialogState.bill}
      />

      <DeleteConfirmationDialog
        open={!!deletingAttachmentBill}
        onOpenChange={(open) => { if (!open) setDeletingAttachmentBill(null); }}
        title="Remove Attachment?"
        description="Remove this attachment? The bill and its line items will remain in the queue."
        onConfirm={handleDeleteAttachment}
        isLoading={isDeletingAttachment}
      />
    </div>
  );
}
