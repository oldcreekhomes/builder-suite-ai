import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { BatchBillLineItems } from "./BatchBillLineItems";
import { format } from "date-fns";

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
    if (!bill.vendor_id) issues.push("Vendor required");
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

  const getStatusBadge = (bill: PendingBill) => {
    const issues = validateBill(bill);
    
    if (issues.length > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Needs Attention
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Ready
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="w-[120px]">Bill Date</TableHead>
              <TableHead>Reference #</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Attachment</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => {
              const isExpanded = expandedBills.has(bill.id);
              const issues = validateBill(bill);
              
              return (
                <>
                  <TableRow key={bill.id} className={issues.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpanded(bill.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={bill.vendor_name || ''}
                        onChange={(e) => onBillUpdate(bill.id, { vendor_name: e.target.value })}
                        placeholder="Vendor name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={bill.bill_date || ''}
                        onChange={(e) => onBillUpdate(bill.id, { bill_date: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={bill.reference_number || ''}
                        onChange={(e) => onBillUpdate(bill.id, { reference_number: e.target.value })}
                        placeholder="Reference #"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={bill.due_date || ''}
                        onChange={(e) => onBillUpdate(bill.id, { due_date: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={bill.terms || ''}
                        onChange={(e) => onBillUpdate(bill.id, { terms: e.target.value })}
                        placeholder="Terms"
                      />
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/file-redirect?bucket=bill-attachments&path=${bill.file_path}&fileName=${bill.file_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {bill.file_name}
                      </a>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(bill)}
                      {issues.length > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {issues.length} issue{issues.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onBillDelete(bill.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-gray-50 p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Line Items</h4>
                          {issues.length > 0 && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              <ul className="list-disc list-inside">
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
