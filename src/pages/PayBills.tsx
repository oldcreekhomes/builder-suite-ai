import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { PayBillDialog } from "@/components/PayBillDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

export default function PayBills() {
  const { projectId } = useParams();
  const { payBill } = useBills();
  const [selectedBill, setSelectedBill] = useState<BillForPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch bills that are approved and ready for payment (status = 'posted')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-payment', projectId],
    queryFn: async () => {
      if (projectId) {
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
            bill_lines!inner(project_id)
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

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills for payment...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader 
            title="Pay Bills" 
            projectId={projectId}
          />
          <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Pay Bills</h1>
            <p className="text-muted-foreground">Process payments for approved bills.</p>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Vendor</TableHead>
                  {!projectId && (
                    <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
                  )}
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Bill Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Due Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Total Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Reference</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Terms</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={!projectId ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No approved bills found for payment.
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.id} className="h-10">
                      <TableCell className="px-2 py-1 text-xs font-medium">
                        {bill.companies?.company_name || 'Unknown Vendor'}
                      </TableCell>
                      {!projectId && (
                        <TableCell className="px-2 py-1 text-xs">
                          {bill.projects?.address || '-'}
                        </TableCell>
                      )}
                      <TableCell className="px-2 py-1 text-xs">
                        {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        {bill.due_date ? format(new Date(bill.due_date), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs font-medium">
                        {formatCurrency(bill.total_amount)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">
                        {bill.reference_number || '-'}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-xs">{bill.terms || '-'}</TableCell>
                      <TableCell className="px-2 py-1 text-xs">
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
        </div>
      </SidebarInset>
    </div>
    
    <PayBillDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      bill={selectedBill}
      onConfirm={handleConfirmPayment}
      isLoading={payBill.isPending}
    />
  </SidebarProvider>
);
}