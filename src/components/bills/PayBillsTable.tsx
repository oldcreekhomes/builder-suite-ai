import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayBillDialog } from "@/components/PayBillDialog";
import { BillFilesCell } from "@/components/bills/BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { MinimalCheckbox } from "@/components/ui/minimal-checkbox";
import { toast } from "@/hooks/use-toast";
import { Check, ArrowUpDown, ArrowUp, ArrowDown, X, StickyNote } from "lucide-react";
import { BillNotesDialog } from "./BillNotesDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { format } from "date-fns";

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
  amount_paid?: number;
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
  const { payBill, payMultipleBills, deleteBill } = useBills();
  const queryClient = useQueryClient();
  const [selectedBill, setSelectedBill] = useState<BillForPayment | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'vendor' | 'bill_date' | 'due_date' | null>('bill_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    billId: string;
    billInfo?: {
      vendor: string;
      amount: number;
    };
    initialNotes: string;
  }>({
    open: false,
    billId: '',
    billInfo: undefined,
    initialNotes: '',
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ billId, notes }: { billId: string; notes: string }) => {
      const { error } = await supabase
        .from('bills')
        .update({ notes })
        .eq('id', billId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
      toast({
        title: "Notes updated",
        description: "Bill notes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notes.",
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = (notes: string) => {
    updateNotesMutation.mutate({ billId: notesDialog.billId, notes });
  };

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
            amount_paid,
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
            amount_paid,
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
            amount_paid,
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
            amount_paid,
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

  // Helper functions for selection
  const getVendorForBill = (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    return bill?.vendor_id;
  };

  const getSelectedVendor = () => {
    if (selectedBillIds.size === 0) return null;
    const firstBillId = Array.from(selectedBillIds)[0];
    return getVendorForBill(firstBillId);
  };

  const canSelectBill = (billId: string) => {
    if (selectedBillIds.size === 0) return true;
    const selectedVendor = getSelectedVendor();
    const billVendor = getVendorForBill(billId);
    return selectedVendor === billVendor;
  };

  const handleCheckboxChange = (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!canSelectBill(billId)) {
        const selectedVendorName = bills.find(b => b.id === Array.from(selectedBillIds)[0])?.companies?.company_name || 'Unknown';
        toast({
          title: "Cannot select bill",
          description: `You can only select bills from the same vendor. Currently selected: ${selectedVendorName}`,
          variant: "destructive",
        });
        return;
      }
      setSelectedBillIds(prev => new Set([...prev, billId]));
    } else {
      setSelectedBillIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    }
  };

  const handleHeaderCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      // Select all bills from first vendor or all bills from currently selected vendor
      const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
      if (targetVendor) {
        const sameVendorBillIds = filteredBills
          .filter(b => b.vendor_id === targetVendor)
          .map(b => b.id);
        setSelectedBillIds(new Set(sameVendorBillIds));
      }
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const handlePayBill = (bill: BillForPayment) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handlePaySelectedBills = () => {
    const selectedBills = filteredBills.filter(b => selectedBillIds.has(b.id));
    if (selectedBills.length === 0) return;
    
    setSelectedBill(selectedBills.length === 1 ? selectedBills[0] : null);
    setDialogOpen(true);
  };

  const handleConfirmPayment = (billIds: string[], paymentAccountId: string, paymentDate: string, memo?: string, paymentAmount?: number) => {
    if (billIds.length === 1) {
      payBill.mutate(
        { billId: billIds[0], paymentAccountId, paymentDate, memo, paymentAmount },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setSelectedBill(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    } else {
      payMultipleBills.mutate(
        { billIds, paymentAccountId, paymentDate, memo },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setSelectedBill(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    }
  };

  const clearSelection = () => {
    setSelectedBillIds(new Set());
  };

  const selectedBills = useMemo(() => {
    return filteredBills.filter(b => selectedBillIds.has(b.id));
  }, [filteredBills, selectedBillIds]);

  const selectedVendorName = selectedBills.length > 0 
    ? selectedBills[0].companies?.company_name || 'Unknown Vendor'
    : '';

  const selectedTotal = selectedBills.reduce((sum, bill) => sum + (bill.total_amount - (bill.amount_paid || 0)), 0);

  const isHeaderChecked = useMemo(() => {
    if (filteredBills.length === 0) return false;
    const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
    const sameVendorBills = filteredBills.filter(b => b.vendor_id === targetVendor);
    return sameVendorBills.length > 0 && sameVendorBills.every(b => selectedBillIds.has(b.id));
  }, [filteredBills, selectedBillIds]);

  const isHeaderIndeterminate = useMemo(() => {
    if (filteredBills.length === 0) return false;
    const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
    const sameVendorBills = filteredBills.filter(b => b.vendor_id === targetVendor);
    const selectedCount = sameVendorBills.filter(b => selectedBillIds.has(b.id)).length;
    return selectedCount > 0 && selectedCount < sameVendorBills.length;
  }, [filteredBills, selectedBillIds]);

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
      {/* Bulk Payment Toolbar */}
      {selectedBillIds.size > 0 && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {selectedBillIds.size} bill{selectedBillIds.size > 1 ? 's' : ''} selected from {selectedVendorName}
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {formatCurrency(selectedTotal)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePaySelectedBills}
              disabled={payBill.isPending || payMultipleBills.isPending}
            >
              Pay Selected Bills
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-10">
                <MinimalCheckbox
                  checked={isHeaderChecked}
                  indeterminate={isHeaderIndeterminate}
                  onChange={handleHeaderCheckboxChange}
                />
              </TableHead>
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
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-16">Notes</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10 + (showProjectColumn ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No approved bills found for payment.
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs">
                    <MinimalCheckbox
                      checked={selectedBillIds.has(bill.id)}
                      onChange={(e) => handleCheckboxChange(bill.id, e)}
                    />
                  </TableCell>
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
                      {formatCurrency(bill.total_amount - (bill.amount_paid || 0))}
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
                  <TableCell className="px-2 py-1 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={() => setNotesDialog({ 
                              open: true, 
                              billId: bill.id,
                              billInfo: {
                                vendor: bill.companies?.company_name || 'Unknown Vendor',
                                amount: bill.total_amount
                              },
                              initialNotes: bill.notes || ''
                            })}
                          >
                            {bill.notes?.trim() ? (
                              <StickyNote className="h-3.5 w-3.5 text-yellow-600" />
                            ) : (
                              <span className="text-xs text-muted-foreground">Add</span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{bill.notes?.trim() ? 'View/Edit Notes' : 'Add Notes'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                      {!isDateLocked(bill.bill_date) ? (
                        <DeleteButton
                          onDelete={() => deleteBill.mutate(bill.id)}
                          title="Delete Bill"
                          description={`Are you sure you want to delete this bill from ${bill.companies?.company_name || 'Unknown Vendor'} for ${formatCurrency(bill.total_amount)}? This action cannot be undone.`}
                          size="icon"
                          variant="ghost"
                          isLoading={deleteBill.isPending}
                        />
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled
                          className="h-8 w-8"
                        >
                          <span className="text-lg">🔒</span>
                        </Button>
                      )}
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
        bills={selectedBill ? selectedBill : selectedBills}
        onConfirm={handleConfirmPayment}
        isLoading={payBill.isPending || payMultipleBills.isPending}
      />

      <BillNotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => !open && setNotesDialog({ 
          open: false, 
          billId: '', 
          billInfo: undefined, 
          initialNotes: '' 
        })}
        billInfo={notesDialog.billInfo || { vendor: '', amount: 0 }}
        initialValue={notesDialog.initialNotes}
        onSave={handleSaveNotes}
      />
    </>
  );
}
