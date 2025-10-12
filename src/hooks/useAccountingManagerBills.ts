import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BillSummary {
  id: string;
  vendor_name: string;
  project_address: string;
  total_amount: number;
  bill_date: string;
  project_id: string;
}

interface AccountingManagerBillsData {
  pendingCount: number;
  totalAmount: number;
  recentBills: BillSummary[];
  projectIds: string[];
}

export function useAccountingManagerBills() {
  return useQuery({
    queryKey: ['accounting-manager-bills'],
    queryFn: async (): Promise<AccountingManagerBillsData> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { pendingCount: 0, totalAmount: 0, recentBills: [], projectIds: [] };
      }

      // Get projects where current user is the accounting manager
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('accounting_manager', user.id);

      if (projectsError) {
        console.error('Error fetching managed projects:', projectsError);
        return { pendingCount: 0, totalAmount: 0, recentBills: [], projectIds: [] };
      }

      if (!projects || projects.length === 0) {
        return { pendingCount: 0, totalAmount: 0, recentBills: [], projectIds: [] };
      }

      const projectIds = projects.map(p => p.id);

      // Get bills with status 'draft' for those projects
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select(`
          id,
          total_amount,
          bill_date,
          project_id,
          vendor:companies!bills_vendor_id_fkey(company_name),
          project:projects!bills_project_id_fkey(address)
        `)
        .eq('status', 'draft')
        .in('project_id', projectIds)
        .order('bill_date', { ascending: false });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        return { pendingCount: 0, totalAmount: 0, recentBills: [], projectIds: [] };
      }

      const pendingCount = bills?.length || 0;
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
        totalAmount,
        recentBills,
        projectIds,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
}
