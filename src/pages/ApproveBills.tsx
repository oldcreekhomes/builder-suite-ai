import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { useProject } from "@/hooks/useProject";
import { format } from "date-fns";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AccountingSidebar } from "@/components/sidebar/AccountingSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

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
  const { projectId } = useParams();
  const { approveBill, rejectBill } = useBills();
  const { data: project } = useProject(projectId || "");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    billId: string;
    billInfo?: BillForApproval;
  }>({
    open: false,
    action: '',
    billId: '',
    billInfo: undefined,
  });

  // Fetch bills that need approval (status = 'draft')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-approval'],
    queryFn: async () => {
      // Get bills with direct project assignment
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
        .eq('status', 'draft')
        .not('project_id', 'is', null);

      if (directError) throw directError;

      // Get bills without direct project but with project in line items
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
          bill_lines!inner(
            project_id,
            projects!inner(
              address
            )
          )
        `)
        .eq('status', 'draft')
        .is('project_id', null);

      if (indirectError) throw indirectError;

      // Transform indirect bills to match expected structure
      const transformedIndirectBills = indirectBills?.map(bill => ({
        ...bill,
        projects: bill.bill_lines?.[0]?.projects ? {
          address: bill.bill_lines[0].projects.address
        } : undefined
      })) || [];

      // Combine both result sets
      const allBills = [...(directBills || []), ...transformedIndirectBills];
      
      return allBills
        .sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime()) as BillForApproval[];
    },
  });

  const handleActionChange = (billId: string, action: string) => {
    const bill = bills.find(b => b.id === billId);
    setConfirmDialog({
      open: true,
      action,
      billId,
      billInfo: bill,
    });
  };

  const handleConfirmedAction = () => {
    if (confirmDialog.action === 'approve') {
      approveBill.mutate(confirmDialog.billId);
    } else if (confirmDialog.action === 'reject') {
      rejectBill.mutate(confirmDialog.billId);
    }
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined });
  };

  const handleCancelAction = () => {
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined });
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AccountingSidebar projectId={projectId} />
        <SidebarInset>
          <DashboardHeader 
            title={`Bills - Approve Bills${project?.address ? ` - ${project.address}` : ''}`} 
            projectId={projectId}
          />
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
                      <TableCell className="px-2 py-1 text-xs">
                        {bill.status}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Select
                          onValueChange={(value) => handleActionChange(bill.id, value)}
                          disabled={approveBill.isPending || rejectBill.isPending}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs border-gray-200 hover:bg-gray-50">
                            <SelectValue placeholder="Actions" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                            <SelectItem value="approve" className="text-xs hover:bg-gray-100">Approve</SelectItem>
                            <SelectItem value="reject" className="text-xs hover:bg-gray-100">Reject</SelectItem>
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

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelAction()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action === 'approve' ? 'Confirm Bill Approval' : 'Confirm Bill Rejection'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {confirmDialog.action} this bill from{' '}
                <strong>{confirmDialog.billInfo?.companies?.company_name}</strong> for{' '}
                <strong>{formatCurrency(confirmDialog.billInfo?.total_amount || 0)}</strong>?
                {confirmDialog.action === 'reject' && ' This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelAction}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmedAction}
                className={confirmDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {confirmDialog.action === 'approve' ? 'Approve Bill' : 'Reject Bill'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}