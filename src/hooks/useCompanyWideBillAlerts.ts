import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CompanyWideBillAlerts {
  pendingCount: number;
  currentCount: number;
  lateCount: number;
}

export function useCompanyWideBillAlerts() {
  return useQuery({
    queryKey: ['company-wide-bill-alerts'],
    queryFn: async (): Promise<CompanyWideBillAlerts> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { pendingCount: 0, currentCount: 0, lateCount: 0 };
      }

      // Get user's home_builder_id or use their own ID if owner
      const { data: userData } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'employee' || userData?.role === 'accountant'
        ? userData.home_builder_id
        : user.id;

      if (!ownerId) {
        return { pendingCount: 0, currentCount: 0, lateCount: 0 };
      }

      // Get all draft bills for the entire company
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, due_date')
        .eq('owner_id', ownerId)
        .eq('status', 'draft');

      if (error) {
        console.error('Error fetching company-wide bills:', error);
        return { pendingCount: 0, currentCount: 0, lateCount: 0 };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentBills = bills?.filter(bill => {
        if (!bill.due_date) return true; // No due date = not late
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      }) || [];

      const lateBills = bills?.filter(bill => {
        if (!bill.due_date) return false; // No due date = not late
        const dueDate = new Date(bill.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }) || [];

      return {
        pendingCount: bills?.length || 0,
        currentCount: currentBills.length,
        lateCount: lateBills.length,
      };
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
