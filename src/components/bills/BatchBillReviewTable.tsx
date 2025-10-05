import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { BatchBillLineItems } from "./BatchBillLineItems";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());

  const toggleExpanded = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
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
              <TableHead className="w-[40px] px-2 py-0 text-xs font-medium"></TableHead>
              <TableHead className="w-[200px] px-2 py-0 text-xs font-medium">Vendor</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Reference #</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Due Date</TableHead>
              <TableHead className="w-[80px] px-2 py-0 text-xs font-medium">Terms</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Attachment</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => {
              const isExpanded = expandedBills.has(bill.id);
              const issues = validateBill(bill);
              
              return (
                <>
                  <TableRow key={bill.id} className={cn("h-10", issues.length > 0 ? 'bg-yellow-50' : 'bg-green-50')}>
                    <TableCell className="px-2 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpanded(bill.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <span className="text-xs">{bill.vendor_name || '-'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <span className="text-xs">{bill.bill_date ? format(new Date(bill.bill_date), "MM/dd/yy") : '-'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <span className="text-xs">{bill.reference_number || '-'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <span className="text-xs">{bill.due_date ? format(new Date(bill.due_date), "MM/dd/yy") : '-'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <span className="text-xs">{bill.terms || '-'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="relative group inline-block">
                        <a
                          href={`/file-redirect?bucket=bill-attachments&path=${bill.file_path}&fileName=${bill.file_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800 p-1 inline-block"
                          title={bill.file_name}
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => onBillDelete(bill.id)}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-colors"
                          title="Delete bill"
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
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30 px-2 py-1">
                        <div className="space-y-1 p-2">
                          <h4 className="text-xs font-medium">Line Items</h4>
                          {issues.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-1.5 text-xs">
                              <ul className="list-disc list-inside space-y-0.5 text-red-800">
                                {issues.map((issue, idx) => (
                                  <li key={idx}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <BatchBillLineItems
                            lines={bill.lines || []}
                            onLinesChange={(lines) => onLinesUpdate(bill.id, lines)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
