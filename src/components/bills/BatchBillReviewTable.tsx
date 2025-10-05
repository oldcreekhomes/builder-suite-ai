import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EditExtractedBillDialog } from "./EditExtractedBillDialog";

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

interface BatchBillReviewTableProps {
  bills: PendingBill[];
  onBillUpdate: (billId: string, updates: Partial<PendingBill>) => void;
  onBillDelete: (billId: string) => void;
  onLinesUpdate: (billId: string, lines: PendingBillLine[]) => void;
}

export function BatchBillReviewTable({ 
  bills, 
  onBillUpdate, 
  onBillDelete,
  onLinesUpdate 
}: BatchBillReviewTableProps) {
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

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
            {bills.map((bill) => {
              const issues = validateBill(bill);
              const totalAmount = bill.lines?.reduce((sum, line) => {
                return sum + ((line.quantity || 0) * (line.unit_cost || 0));
              }, 0) || 0;
              
              // Calculate account display
              const accountDisplay = (() => {
                if (!bill.lines || bill.lines.length === 0) return '-';
                const uniqueAccounts = [...new Set(bill.lines.map(line => line.account_name).filter(Boolean))];
                if (uniqueAccounts.length === 0) return '-';
                if (uniqueAccounts.length === 1) return uniqueAccounts[0];
                return `${uniqueAccounts.length} accounts`;
              })();
              
              return (
                <TableRow key={bill.id} className={cn("h-10", issues.length > 0 ? 'bg-yellow-50' : 'bg-green-50')}>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{bill.vendor_name || '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{bill.reference_number || '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{bill.bill_date ? format(new Date(bill.bill_date), "MM/dd/yy") : '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{bill.due_date ? format(new Date(bill.due_date), "MM/dd/yy") : '-'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs">{accountDisplay}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <span className="text-xs font-medium">${totalAmount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <a
                      href={`/file-redirect?bucket=bill-attachments&path=${bill.file_path}&fileName=${bill.file_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-800 p-1 inline-block"
                      title={bill.file_name}
                    >
                      <FileText className="h-4 w-4" />
                    </a>
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
                        className="h-6 px-2 text-xs"
                        onClick={() => setEditingBillId(bill.id)}
                        title="Edit bill"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
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
            })}
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
