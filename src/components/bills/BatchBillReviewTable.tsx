import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Trash2, AlertCircle, CheckCircle, Building2, CalendarIcon } from "lucide-react";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { BatchBillLineItems } from "./BatchBillLineItems";
import { format } from "date-fns";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        <Badge variant="destructive" className="h-5 text-xs px-2 gap-1">
          <AlertCircle className="h-3 w-3" />
          Needs Attention
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="h-5 text-xs px-2 gap-1 bg-green-600">
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
            <TableRow className="h-8">
              <TableHead className="w-[40px] px-2 py-0 text-xs font-medium"></TableHead>
              <TableHead className="w-[200px] px-2 py-0 text-xs font-medium">Vendor</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="w-[120px] px-2 py-0 text-xs font-medium">Reference #</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Due Date</TableHead>
              <TableHead className="w-[100px] px-2 py-0 text-xs font-medium">Terms</TableHead>
              <TableHead className="w-[180px] px-2 py-0 text-xs font-medium">Attachment</TableHead>
              <TableHead className="w-[120px] px-2 py-0 text-xs font-medium">Status</TableHead>
              <TableHead className="w-[60px] px-2 py-0 text-xs font-medium"></TableHead>
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
                      <div className="space-y-1">
                        {bill.vendor_name && !bill.vendor_id && !isVendorInSystem(bill.vendor_name) && (
                          <div className="flex items-center justify-between gap-2 text-xs py-0.5">
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              <span className="text-amber-600">No company found</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-5 text-xs px-1.5"
                              onClick={() => handleCreateCompany(bill.id, bill.vendor_name!)}
                            >
                              <Building2 className="h-3 w-3 mr-0.5" />
                              Create
                            </Button>
                          </div>
                        )}
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
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-7 justify-start text-left text-xs px-2",
                              !bill.bill_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {bill.bill_date ? format(new Date(bill.bill_date), "MM/dd/yy") : "Select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={bill.bill_date ? new Date(bill.bill_date) : undefined}
                            onSelect={(date) => onBillUpdate(bill.id, { bill_date: date ? format(date, "yyyy-MM-dd") : undefined })}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Input
                        value={bill.reference_number || ''}
                        onChange={(e) => onBillUpdate(bill.id, { reference_number: e.target.value })}
                        placeholder="Ref #"
                        className="h-7 text-xs px-2"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-7 justify-start text-left text-xs px-2",
                              !bill.due_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {bill.due_date ? format(new Date(bill.due_date), "MM/dd/yy") : "Select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={bill.due_date ? new Date(bill.due_date) : undefined}
                            onSelect={(date) => onBillUpdate(bill.id, { due_date: date ? format(date, "yyyy-MM-dd") : undefined })}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Input
                        value={bill.terms || ''}
                        onChange={(e) => onBillUpdate(bill.id, { terms: e.target.value })}
                        placeholder="Terms"
                        className="h-7 text-xs px-2"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <a
                        href={`/file-redirect?bucket=bill-attachments&path=${bill.file_path}&fileName=${bill.file_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline text-xs truncate max-w-[160px]"
                        title={bill.file_name}
                      >
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{bill.file_name}</span>
                      </a>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0.5">
                        {getStatusBadge(bill)}
                        {issues.length > 0 && (
                          <div className="text-xs text-red-600">
                            {issues.length} issue{issues.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onBillDelete(bill.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 px-2 py-1">
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
      
      <AddCompanyDialog
        open={addCompanyDialogOpen}
        onOpenChange={setAddCompanyDialogOpen}
        initialCompanyName={vendorNameToCreate}
        onCompanyCreated={handleCompanyCreated}
      />
    </div>
  );
}
