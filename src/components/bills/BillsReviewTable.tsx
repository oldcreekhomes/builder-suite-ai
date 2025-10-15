import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { BillFilesCell } from "./BillFilesCell";

interface BillsReviewTableProps {
  projectId?: string;
  projectIds?: string[];
  showProjectColumn?: boolean;
}

export const BillsReviewTable = ({ projectId, projectIds, showProjectColumn }: BillsReviewTableProps) => {
  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', 'draft', projectId, projectIds],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select(`
          *,
          companies!bills_vendor_id_fkey(company_name),
          projects(address),
          bill_lines(
            *,
            cost_codes(code, name),
            accounts(code, name),
            projects(address)
          ),
          bill_attachments(*)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (projectIds && projectIds.length > 0) {
        query = query.in('project_id', projectIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTerms = (terms: string | null) => {
    if (!terms) return 'N/A';
    const match = terms.match(/Net (\d+)/i);
    return match ? `Net ${match[1]}` : terms;
  };

  const getCostCodeOrAccount = (bill: any) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return 'N/A';
    const firstLine = bill.bill_lines[0];
    if (firstLine.cost_codes) {
      return `${firstLine.cost_codes.code}: ${firstLine.cost_codes.name}`;
    }
    if (firstLine.accounts) {
      return `${firstLine.accounts.code}: ${firstLine.accounts.name}`;
    }
    return 'N/A';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Bills to Review</h3>
        <p className="text-sm text-muted-foreground">
          Bills that need review will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Ref #</TableHead>
              <TableHead>Bill Date</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Cost Code</TableHead>
              {showProjectColumn && <TableHead>Project</TableHead>}
              <TableHead className="text-right">Total</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>{bill.companies?.company_name || 'Unknown'}</TableCell>
                <TableCell>{bill.reference_number || '-'}</TableCell>
                <TableCell>{formatDate(bill.bill_date)}</TableCell>
                <TableCell>{formatTerms(bill.terms)}</TableCell>
                <TableCell>{bill.due_date ? formatDate(bill.due_date) : '-'}</TableCell>
                <TableCell className="text-sm">{getCostCodeOrAccount(bill)}</TableCell>
                {showProjectColumn && (
                  <TableCell>{bill.projects?.address || 'Company'}</TableCell>
                )}
                <TableCell className="text-right font-medium">
                  {formatCurrency(bill.total_amount)}
                </TableCell>
                <TableCell>
                  <BillFilesCell attachments={bill.bill_attachments || []} />
                </TableCell>
                <TableCell>
                  {bill.bill_lines?.some((line: any) => !line.cost_code_id && !line.account_id) && (
                    <span className="text-sm text-destructive">Missing codes</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {/* Edit functionality to be added */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
