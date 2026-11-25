import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { todayLocalStr, isCountableBill, isReviewBill, isApprovedBill, isRejectedBill, isLateBill } from "@/lib/billIssues";

interface BillSummary {
  id: string;
  vendor_name: string;
  project_address: string;
  total_amount: number;
  bill_date: string;
  project_id: string;
}

interface ProjectBillSummary {
  projectId: string;
  projectAddress: string;
  reviewCount: number;
  approvedCount: number;
  reviewLateCount: number;
  approvedLateCount: number;
  rejectedCount: number;
  lateCount: number;
  totalCount: number;
  qbInvoicesApprovedDate: string | null;
}

interface AccountingManagerBillsData {
  pendingCount: number;
  currentCount: number;
  lateCount: number;
  totalAmount: number;
  recentBills: BillSummary[];
  projectIds: string[];
  projectsWithCounts: ProjectBillSummary[];
}

export function useAccountingManagerBills() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['accounting-manager-bills', userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccountingManagerBillsData> => {
      if (!userId) {
        return { pendingCount: 0, currentCount: 0, lateCount: 0, totalAmount: 0, recentBills: [], projectIds: [], projectsWithCounts: [] };
      }

      // Get active projects where the current user is the accounting manager
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, address, status, qb_invoices_approved_date')
        .eq('accounting_manager', userId)
        .not('status', 'in', '("Template","Permanently Closed")');

      if (projectsError) {
        console.error('Error fetching managed projects:', projectsError);
        return { pendingCount: 0, currentCount: 0, lateCount: 0, totalAmount: 0, recentBills: [], projectIds: [], projectsWithCounts: [] };
      }

      if (!projects || projects.length === 0) {
        return { pendingCount: 0, currentCount: 0, lateCount: 0, totalAmount: 0, recentBills: [], projectIds: [], projectsWithCounts: [] };
      }

      const projectIds = projects.map(p => p.id);

      // Get bills with status 'draft' for those projects
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select(`
          id,
          total_amount,
          bill_date,
          due_date,
          project_id,
          status,
          terms,
          is_reversal,
          reversed_by_id,
          archived_at,
          vendor:companies!bills_vendor_id_fkey(company_name),
          project:projects!bills_project_id_fkey(address)
        `)
        .in('status', ['draft', 'posted', 'void'])
        .in('project_id', projectIds)
        .order('bill_date', { ascending: false });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        return { pendingCount: 0, currentCount: 0, lateCount: 0, totalAmount: 0, recentBills: [], projectIds: [], projectsWithCounts: [] };
      }

      const todayStr = todayLocalStr();
      const countable = (bills || []).filter(b => isCountableBill(b as any));
      const isCur = (b: any) => isReviewBill(b, todayStr);
      const isLate = (b: any) => isLateBill(b, todayStr);

      // Same shared rules as the Accounting dashboard and project Accounting Alerts
      const projectsWithCounts: ProjectBillSummary[] = projects.map(project => {
        const projectBills = countable.filter(bill => bill.project_id === project.id);
        return {
          projectId: project.id,
          projectAddress: project.address || 'Unknown Project',
          reviewCount: projectBills.filter(isCur).length,
          approvedCount: projectBills.filter(b => isApprovedBill(b as any, todayStr)).length,
          rejectedCount: projectBills.filter(b => isRejectedBill(b as any)).length,
          lateCount: projectBills.filter(isLate).length,
          reviewLateCount: projectBills.filter(b => isCur(b) && isLate(b)).length,
          approvedLateCount: projectBills.filter(b => isApprovedBill(b as any, todayStr) && isLate(b)).length,
          totalCount: projectBills.length,
          qbInvoicesApprovedDate: (project as any).qb_invoices_approved_date ?? null,
        };
      });

      const currentBills = countable.filter(isCur);
      const lateBills = countable.filter(isLate);

      const pendingCount = countable.length;
      const currentCount = currentBills.length;
      const lateCount = lateBills.length;
      const totalAmount = bills?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
      
      const recentBills: BillSummary[] = (bills || []).slice(0, 5).map(bill => ({
        id: bill.id,
        vendor_name: (bill.vendor as any)?.company_name || 'Unknown Vendor',
        project_address: (bill.project as any)?.address || 'Unknown Project',
        total_amount: Number(bill.total_amount),
        bill_date: bill.bill_date,
        project_id: bill.project_id || '',
      }));

      return {
        pendingCount,
        currentCount,
        lateCount,
        totalAmount,
        recentBills,
        projectIds,
        projectsWithCounts,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });
}
