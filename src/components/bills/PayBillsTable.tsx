import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayBillDialog } from "@/components/PayBillDialog";
import { BillFilesCell } from "@/components/bills/BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BillAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

interface BillForPayment {
  id: string;
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  reference_number: string | null;
  terms: string | null;
  notes?: string;
  status: string;
  reconciled: boolean;
  companies?: {
    company_name: string;
  };
  projects?: {
    address: string;
  };
  bill_attachments?: BillAttachment[];
  bill_lines?: Array<{
    line_type: string;
    cost_code_id?: string;
    account_id?: string;
    cost_codes?: {
      code: string;
      name: string;
    };
    accounts?: {
      code: string;
      name: string;
    };
  }>;
}

interface PayBillsTableProps {
  projectId?: string;
  projectIds?: string[];
  showProjectColumn?: boolean;
  searchQuery?: string;
  dueDateFilter?: "all" | "due-on-or-before";
  filterDate?: Date;
}

export function PayBillsTable({ projectId, projectIds, showProjectColumn = true, searchQuery, dueDateFilter = "all", filterDate }: PayBillsTableProps) {
  const { payBill, deleteBill } = useBills();
  const [selectedBill, setSelectedBill] = useState<BillForPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'vendor' | 'bill_date' | 'due_date' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: 'vendor' | 'bill_date' | 'due_date') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Fetch bills that are approved and ready for payment (status = 'posted')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-payment', projectId, projectIds],
    queryFn: async () => {
      if (projectIds && projectIds.length > 0) {
        // Multiple project filtering - get bills for specific projects
        const { data: directBills, error: directError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            reference_number,
            terms,
            notes,
            status,
            reconciled,
            companies:vendor_id (
              company_name
            ),
            projects:project_id (
              address
            ),
            bill_attachments (
              id,
              file_name,
              file_path,
              file_size,
              content_type
            ),
            bill_lines (
              line_type,
              cost_code_id,
              account_id,
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .in('project_id', projectIds)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (directError) throw directError;
        return (directBills || []) as BillForPayment[];
      } else if (projectId) {
        // Project-specific bills - get bills directly assigned to project
        const { data: directBills, error: directError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            reference_number,
            terms,
            notes,
            status,
            reconciled,
            companies:vendor_id (
              company_name
            ),
            projects:project_id (
              address
            ),
            bill_attachments (
              id,
              file_name,
              file_path,
              file_size,
              content_type
            ),
            bill_lines (
              line_type,
              cost_code_id,
              account_id,
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .eq('project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (directError) throw directError;

        // Get bills with line items assigned to project but bill header has no project
        const { data: indirectBills, error: indirectError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            reference_number,
            terms,
            notes,
            status,
            reconciled,
            companies:vendor_id (
              company_name
            ),
            projects:project_id (
              address
            ),
            bill_lines!inner(
              project_id,
              line_type,
              cost_code_id,
              account_id,
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            ),
            bill_attachments (
              id,
              file_name,
              file_path,
              file_size,
              content_type
            )
          `)
          .eq('status', 'posted')
          .is('project_id', null)
          .eq('bill_lines.project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (indirectError) throw indirectError;

        // Combine and deduplicate bills
        const allBills = [...(directBills || []), ...(indirectBills || [])];
        const uniqueBills = allBills.filter((bill, index, array) => 
          array.findIndex(b => b.id === bill.id) === index
        );

        return uniqueBills as BillForPayment[];
      } else {
        // Company-level bills - show all bills
        const { data, error } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            reference_number,
            terms,
            notes,
            status,
            reconciled,
            companies:vendor_id (
              company_name
            ),
            projects:project_id (
              address
            ),
            bill_attachments (
              id,
              file_name,
              file_path,
              file_size,
              content_type
            ),
            bill_lines (
              line_type,
              cost_code_id,
              account_id,
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .order('due_date', { ascending: true, nullsFirst: false });
        
        if (error) throw error;
        return data as BillForPayment[];
      }
    },
  });

  const sortedBills = useMemo(() => {
    if (!bills || bills.length === 0) return bills;
    if (!sortColumn) return bills;

    const arr = [...bills];
    const toYMD = (d?: string) => normalizeToYMD(d || '');

    return arr.sort((a, b) => {
      let cmp = 0;

      if (sortColumn === 'vendor') {
        const aVendor = (a.companies?.company_name || '').toLowerCase();
        const bVendor = (b.companies?.company_name || '').toLowerCase();
        cmp = aVendor.localeCompare(bVendor);
      } else if (sortColumn === 'bill_date') {
        cmp = toYMD(a.bill_date).localeCompare(toYMD(b.bill_date));
      } else if (sortColumn === 'due_date') {
        const aD = a.due_date || '';
        const bD = b.due_date || '';
        if (!aD && bD) cmp = 1;
        else if (aD && !bD) cmp = -1;
        else if (!aD && !bD) cmp = 0;
        else cmp = toYMD(aD).localeCompare(toYMD(bD));
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [bills, sortColumn, sortDirection]);

  const filteredBills = useMemo(() => {
    let filtered = sortedBills;

    // Apply date filter
    if (dueDateFilter === "due-on-or-before" && filterDate && filtered) {
      const filterDateYMD = normalizeToYMD(filterDate.toISOString());
      filtered = filtered.filter(bill => {
        if (!bill.due_date) return false;
        const billDueDateYMD = normalizeToYMD(bill.due_date);
        return billDueDateYMD <= filterDateYMD;
      });
    }

    // Apply search filter
    if (searchQuery && filtered) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill => {
        // Search by vendor name
        const vendorName = (bill.companies?.company_name || '').toLowerCase();
        if (vendorName.includes(query)) return true;

        // Search by reference number
        const refNumber = (bill.reference_number || '').toLowerCase();
        if (refNumber.includes(query)) return true;

        // Search by project address
        const projectAddress = (bill.projects?.address || '').toLowerCase();
        if (projectAddress.includes(query)) return true;

        // Search by cost codes
        if (bill.bill_lines) {
          const matchesCostCode = bill.bill_lines.some(line => {
            if (line.cost_codes) {
              const code = (line.cost_codes.code || '').toLowerCase();
              const name = (line.cost_codes.name || '').toLowerCase();
              return code.includes(query) || name.includes(query);
            }
            return false;
          });
          if (matchesCostCode) return true;
        }

        return false;
      });
    }

    return filtered;
  }, [sortedBills, searchQuery, dueDateFilter, filterDate]);

  const handlePayBill = (bill: BillForPayment) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handleConfirmPayment = (billId: string, paymentAccountId: string, paymentDate: string, memo?: string) => {
    payBill.mutate(
      { billId, paymentAccountId, paymentDate, memo },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedBill(null);
        }
      }
    );
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(absAmount);
    
    if (amount < 0) {
      return <span className="text-green-600 font-medium">({formatted})</span>;
    }
    return formatted;
  };

  const formatTerms = (terms: string | null | undefined) => {
    if (!terms) return '-';
    
    const termMap: Record<string, string> = {
      'due-on-receipt': 'On Receipt',
      'net-15': 'Net 15',
      'net-30': 'Net 30',
      'net-60': 'Net 60',
      'net-90': 'Net 90',
    };
    
    return termMap[terms.toLowerCase()] || terms;
  };

  const getCostCodeOrAccount = (bill: BillForPayment) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return '-';
    
    const uniqueItems = new Set<string>();
    bill.bill_lines.forEach(line => {
      if (line.cost_codes) {
        uniqueItems.add(`${line.cost_codes.code}: ${line.cost_codes.name}`);
      } else if (line.accounts) {
        uniqueItems.add(`${line.accounts.code}: ${line.accounts.name}`);
      }
    });
    
    const items = Array.from(uniqueItems);
    if (items.length === 0) return '-';
    if (items.length === 1) return items[0];
    return `${items[0]} +${items.length - 1}`;
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills for payment...</div>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('vendor')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <span>Vendor</span>
                  {sortColumn === 'vendor' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              {showProjectColumn && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              )}
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('bill_date')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <span>Bill Date</span>
                  {sortColumn === 'bill_date' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('due_date')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <span>Due Date</span>
                  {sortColumn === 'due_date' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-40">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Files</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9 + (showProjectColumn ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No approved bills found for payment.
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.companies?.company_name || 'Unknown Vendor'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {getCostCodeOrAccount(bill)}
                  </TableCell>
                  {showProjectColumn && (
                    <TableCell className="px-2 py-1 text-xs">
                      {bill.projects?.address || '-'}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1 text-xs">
                    {formatDisplayFromAny(bill.bill_date)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.due_date ? (
                      (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = new Date(bill.due_date);
                        dueDate.setHours(0, 0, 0, 0);
                        const isOverdue = dueDate < today;
                        
                        return (
                          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                            {formatDisplayFromAny(bill.due_date)}
                          </span>
                        );
                      })()
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      {formatCurrency(bill.total_amount)}
                      {bill.total_amount < 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Credit
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {bill.reference_number || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">{formatTerms(bill.terms)}</TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    <BillFilesCell attachments={bill.bill_attachments || []} />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                        disabled={payBill.isPending}
                        className="h-7 text-xs px-3"
                      >
                        {payBill.isPending ? "Processing..." : "Pay Bill"}
                      </Button>
                      <DeleteButton
                        onDelete={() => deleteBill.mutate(bill.id)}
                        title="Delete Bill"
                        description={`Are you sure you want to delete this bill from ${bill.companies?.company_name || 'Unknown Vendor'} for ${formatCurrency(bill.total_amount)}? This action cannot be undone.`}
                        size="icon"
                        variant="ghost"
                        isLoading={deleteBill.isPending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {bills.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Total bills: {bills.length}</p>
          <p>Total amount: {formatCurrency(bills.reduce((sum, bill) => sum + bill.total_amount, 0))}</p>
        </div>
      )}

      <PayBillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bill={selectedBill}
        onConfirm={handleConfirmPayment}
        isLoading={payBill.isPending}
      />
    </>
  );
}
