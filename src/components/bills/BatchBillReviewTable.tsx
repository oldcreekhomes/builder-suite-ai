import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import { EditExtractedBillDialog } from "./EditExtractedBillDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { openFileViaRedirect } from "@/utils/fileOpenUtils";

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
}

interface ProcessingUpload {
  id: string;
  file_name: string;
  status: 'pending' | 'processing';
}

interface BatchBillReviewTableProps {
  bills: PendingBill[];
  processingUploads?: ProcessingUpload[];
  onBillUpdate: (billId: string, updates: Partial<PendingBill>) => void;
  onBillDelete: (billId: string) => void;
  onLinesUpdate: (billId: string, lines: PendingBillLine[]) => void;
}

export function BatchBillReviewTable({ 
  bills,
  processingUploads = [], // Shows loading state for bills being extracted
  onBillUpdate, 
  onBillDelete,
  onLinesUpdate 
}: BatchBillReviewTableProps) {
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

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
    if (!bill.vendor_id) {
      if (!bill.vendor_name) {
        issues.push("Vendor required");
      }
      // Don't add "vendor required" if vendor name exists but not in system
      // We'll show a different UI for that case
    }
    
    if (!bill.bill_date) issues.push("Bill date required");
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


  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-[200px] px-2 py-0 text-xs font-medium">Vendor</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Reference #</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Due Date</TableHead>
              <TableHead className="w-[150px] px-2 py-0 text-xs font-medium">Account</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Total</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">File</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Status</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Processing uploads skeleton rows */}
            {processingUploads.map((upload) => (
              <TableRow key={upload.id} className="bg-blue-50/50">
                <TableCell className="px-2 py-3">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className="px-2 py-3">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell colSpan={5} className="px-2 py-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Extracting data from {upload.file_name}...</span>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="px-2 py-3">
                  <Skeleton className="h-8 w-16" />
                </TableCell>
              </TableRow>
            ))}
            
            {/* Show empty state only if no bills AND no processing uploads */}
            {bills.length === 0 && processingUploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No bills uploaded yet</p>
                    <p className="text-xs mt-1">Upload PDF files above to extract bill data automatically</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => {
              const issues = validateBill(bill);
              
              // Get total from extracted data or calculate from lines
              const extractedTotal = getExtractedValue(bill, 'total_amount', 'totalAmount');
              const totalAmount = extractedTotal 
                ? (typeof extractedTotal === 'string' ? parseFloat(extractedTotal) : extractedTotal)
                : (bill.lines?.reduce((sum, line) => {
                    return sum + ((line.quantity || 0) * (line.unit_cost || 0));
                  }, 0) || 0);
              
              // Calculate account display
              const accountDisplay = (() => {
                if (!bill.lines || bill.lines.length === 0) return '-';
                const uniqueAccounts = [...new Set(bill.lines.map(line => line.account_name).filter(Boolean))];
                if (uniqueAccounts.length === 0) return '-';
                if (uniqueAccounts.length === 1) return uniqueAccounts[0];
                return `${uniqueAccounts.length} accounts`;
              })();
              
              const vendorName = getExtractedValue(bill, 'vendor_name', 'vendor');
              const referenceNumber = getExtractedValue(bill, 'reference_number', 'referenceNumber');
              const billDate = getExtractedValue(bill, 'bill_date', 'billDate');
              const dueDate = getExtractedValue(bill, 'due_date', 'dueDate');
              
              return (
                <TableRow key={bill.id} className={cn("h-10", issues.length > 0 ? 'bg-yellow-50' : 'bg-green-50')}>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{vendorName || '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{referenceNumber || '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{billDate ? formatDisplayFromAny(billDate as string) : '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{dueDate ? formatDisplayFromAny(dueDate as string) : '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{accountDisplay}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs font-medium">${totalAmount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="relative group inline-block">
                      <button
                        onClick={() => {
                          const displayName = bill.file_name.split('/').pop() || bill.file_name;
                          openFileViaRedirect('bill-attachments', bill.file_path, displayName);
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBillDelete(bill.id);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                        title="Delete file"
                        type="button"
                      >
                        <span className="text-xs font-bold leading-none">×</span>
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {issues.length > 0 ? (
                      <span className="text-xs text-red-600">{issues.length} Issue{issues.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-xs text-green-600">Ready</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingBillId(bill.id)}
                        title="Edit bill"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onBillDelete(bill.id)}
                        title="Delete bill"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>
      
      {editingBillId && (
        <EditExtractedBillDialog
          open={!!editingBillId}
          onOpenChange={(open) => !open && setEditingBillId(null)}
          pendingUploadId={editingBillId}
        />
      )}
    </div>
  );
}
