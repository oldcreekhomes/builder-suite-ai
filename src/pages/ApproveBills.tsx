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
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";

interface BillForApproval {
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

export default function ApproveBills() {
  const { approveBill, rejectBill } = useBills();

  // Fetch bills that need approval (status = 'draft')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-approval'],
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
        .eq('status', 'draft')
        .order('bill_date', { ascending: false });
      
      if (error) throw error;
      return data as BillForApproval[];
    },
  });

  const handleActionChange = (billId: string, action: string) => {
    if (action === 'approve') {
      approveBill.mutate(billId);
    } else if (action === 'reject') {
      rejectBill.mutate(billId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills for approval...</div>;
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <CompanyDashboardHeader />
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Approve Bills</h1>
            <p className="text-muted-foreground">Review and approve or reject bills that require approval.</p>
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
                      No bills requiring approval found.
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
                        {bill.due_date ? format(new Date(bill.due_date), 'MMM dd, yyyy') : '-'}
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
                        <Badge variant="secondary" className="text-xs">
                          {bill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right">
                        <Select
                          onValueChange={(value) => handleActionChange(bill.id, value)}
                          disabled={approveBill.isPending || rejectBill.isPending}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue placeholder="Nothing" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approve">Approve</SelectItem>
                            <SelectItem value="reject">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}