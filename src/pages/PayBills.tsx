import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { format } from "date-fns";

interface BillForPayment {
  id: string;
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date?: string;
  total_amount: number;
  reference_number?: string;
  terms?: string;
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
  const { payBill } = useBills();

  // Fetch bills that are approved and ready for payment (status = 'posted')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-payment'],
    queryFn: async () => {
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
    },
  });

  const handleActionChange = (billId: string, action: string) => {
    if (action === 'pay') {
      payBill.mutate(billId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const daysUntilDue = getDaysUntilDue(dueDate);
    
    if (daysUntilDue < 0) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Due Soon</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">On Time</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills for payment...</div>;
  }

  return (
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
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Due Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Total Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Status</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No approved bills found for payment.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    {bill.companies?.company_name || 'Unknown Vendor'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.projects?.address || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span>
                        {bill.due_date ? format(new Date(bill.due_date), 'MMM dd, yyyy') : '-'}
                      </span>
                      {getDueDateBadge(bill.due_date)}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    {formatCurrency(bill.total_amount)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.reference_number || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.terms || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Select
                      onValueChange={(value) => handleActionChange(bill.id, value)}
                      disabled={payBill.isPending}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue placeholder="Nothing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pay">Mark as Paid</SelectItem>
                      </SelectContent>
                    </Select>
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
  );
}