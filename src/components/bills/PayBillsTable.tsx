import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import { Button } from "@/components/ui/button";
import { PayBillDialog } from "@/components/PayBillDialog";
import { BillFilesCell } from "@/components/bills/BillFilesCell";
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
}

export function PayBillsTable({ projectId, projectIds }: PayBillsTableProps) {
  const { payBill } = useBills();
  const [selectedBill, setSelectedBill] = useState<BillForPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Vendor</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              {!projectId && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              )}
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Due Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-40">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Files</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={!projectId ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  No approved bills found for payment.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.companies?.company_name || 'Unknown Vendor'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {getCostCodeOrAccount(bill)}
                  </TableCell>
                  {!projectId && (
                    <TableCell className="px-2 py-1 text-xs">
                      {bill.projects?.address || '-'}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1 text-xs">
                    {formatDisplayFromAny(bill.bill_date)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.due_date ? formatDisplayFromAny(bill.due_date) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    {formatCurrency(bill.total_amount)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {bill.reference_number || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">{formatTerms(bill.terms)}</TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    <BillFilesCell attachments={bill.bill_attachments || []} />
                  </TableCell>
                  <TableCell className="py-1 text-xs">
                    <Button
                      size="sm"
                      onClick={() => handlePayBill(bill)}
                      disabled={payBill.isPending}
                      className="h-7 text-xs px-3"
                    >
                      {payBill.isPending ? "Processing..." : "Pay Bill"}
                    </Button>
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
