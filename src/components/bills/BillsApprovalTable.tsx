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
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { BillFilesCell } from "./BillFilesCell";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";

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
  bill_attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    content_type: string;
  }>;
  bill_lines?: Array<{
    cost_code_id?: string;
    account_id?: string;
    cost_codes?: {
      name: string;
    };
    accounts?: {
      name: string;
    };
  }>;
}

interface BillsApprovalTableProps {
  status: 'draft' | 'void' | 'posted';
}

export function BillsApprovalTable({ status }: BillsApprovalTableProps) {
  const { approveBill, rejectBill } = useBills();
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

  // Fetch bills based on status
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-approval-v2', status],
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
          ),
          bill_attachments (
            id,
            file_name,
            file_path,
            file_size,
            content_type
          ),
          bill_lines (
            cost_code_id,
            account_id,
            cost_codes:cost_code_id (
              name
            ),
            accounts:account_id (
              name
            )
          )
        `)
        .eq('status', status)
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
            cost_code_id,
            account_id,
            projects!inner(
              address
            ),
            cost_codes:cost_code_id (
              name
            ),
            accounts:account_id (
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
        .eq('status', status)
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
      
      // Sort by date strings (YYYY-MM-DD lexicographical sort)
      return allBills
        .sort((a, b) => normalizeToYMD(b.bill_date).localeCompare(normalizeToYMD(a.bill_date))) as BillForApproval[];
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

  const getCostCodeOrAccount = (bill: BillForApproval) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return '-';
    
    const uniqueItems = new Set<string>();
    bill.bill_lines.forEach(line => {
      if (line.cost_codes?.name) {
        uniqueItems.add(line.cost_codes.name);
      } else if (line.accounts?.name) {
        uniqueItems.add(line.accounts.name);
      }
    });
    
    const items = Array.from(uniqueItems);
    if (items.length === 0) return '-';
    if (items.length === 1) return items[0];
    return `${items[0]} +${items.length - 1}`;
  };

  const canShowActions = status === 'draft';

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills...</div>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Vendor</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Due Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Total Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Files</TableHead>
              {canShowActions && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-left">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canShowActions ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  No bills found for this status.
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
                    {getCostCodeOrAccount(bill)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {formatDisplayFromAny(bill.bill_date)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.due_date ? formatDisplayFromAny(bill.due_date) : '-'}
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
                    <BillFilesCell attachments={bill.bill_attachments || []} />
                  </TableCell>
                  {canShowActions && (
                    <TableCell className="px-2 py-1 text-left">
                      <div className="flex justify-start">
                        <Select
                          onValueChange={(value) => handleActionChange(bill.id, value)}
                          disabled={approveBill.isPending || rejectBill.isPending}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs border-gray-200 bg-white hover:bg-gray-50">
                            <SelectValue placeholder="Actions" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                            <SelectItem value="approve" className="text-xs hover:bg-gray-100 bg-white">Approve</SelectItem>
                            <SelectItem value="reject" className="text-xs hover:bg-gray-100 bg-white">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
}