import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Trash2, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { BatchBillLineItems } from "./BatchBillLineItems";
import { format } from "date-fns";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";

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
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [vendorNameToCreate, setVendorNameToCreate] = useState("");
  const [billIdForVendor, setBillIdForVendor] = useState("");
  
  const { companies, loading: loadingCompanies } = useCompanySearch();

  const toggleExpanded = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const isVendorInSystem = (vendorName: string) => {
    if (!vendorName) return false;
    const lowercaseName = vendorName.toLowerCase().trim();
    return companies.some(c => c.company_name.toLowerCase().trim() === lowercaseName);
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

  const handleCreateCompany = (billId: string, vendorName: string) => {
    setBillIdForVendor(billId);
    setVendorNameToCreate(vendorName);
    setAddCompanyDialogOpen(true);
  };

  const handleCompanyCreated = (companyId: string, companyName: string) => {
    // Link the created company to the bill
    if (billIdForVendor) {
      onBillUpdate(billIdForVendor, { 
        vendor_id: companyId, 
        vendor_name: companyName 
      });
    }
    // Reset state
    setBillIdForVendor("");
    setVendorNameToCreate("");
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
                      <div className="space-y-2">
                        <VendorSearchInput
                          value={bill.vendor_name || ''}
                          onChange={(vendorName) => {
                            // Find the company by name to get the ID
                            const company = companies.find(c => 
                              c.company_name.toLowerCase().trim() === vendorName.toLowerCase().trim()
                            );
                            onBillUpdate(bill.id, { 
                              vendor_id: company?.id, 
                              vendor_name: vendorName 
                            });
                          }}
                          onCompanySelect={(company) => {
                            // Find the full company details to get the ID
                            const fullCompany = companies.find(c => 
                              c.company_name === company.company_name
                            );
                            if (fullCompany) {
                              onBillUpdate(bill.id, { 
                                vendor_id: fullCompany.id, 
                                vendor_name: fullCompany.company_name 
                              });
                            }
                          }}
                        />
                        {bill.vendor_name && !bill.vendor_id && !isVendorInSystem(bill.vendor_name) && (
                          <div className="flex items-center gap-2 text-xs">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            <span className="text-amber-600">This company is not currently in the system</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => handleCreateCompany(bill.id, bill.vendor_name!)}
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              Create New Company
                            </Button>
                          </div>
                        )}
                      </div>
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
      
      <AddCompanyDialog
        open={addCompanyDialogOpen}
        onOpenChange={setAddCompanyDialogOpen}
        initialCompanyName={vendorNameToCreate}
        onCompanyCreated={handleCompanyCreated}
      />
    </div>
  );
}
