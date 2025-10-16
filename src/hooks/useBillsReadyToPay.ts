import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationPreferences } from "./useNotificationPreferences";

interface BillsReadyToPayData {
  count: number;
  totalAmount: number;
  projectIds: string[];
  hasAccess: boolean;
}

export function useBillsReadyToPay() {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const hasAccess = preferences?.receive_bill_payment_alerts ?? false;

  return useQuery({
    queryKey: ['bills-ready-to-pay', hasAccess],
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    enabled: !prefsLoading,
    queryFn: async (): Promise<BillsReadyToPayData> => {
      // If user doesn't have access, return empty data
      if (!hasAccess) {
        return {
          count: 0,
          totalAmount: 0,
          projectIds: [],
          hasAccess: false,
        };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
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
        throw new Error('Unable to determine company');
      }

      // Fetch bills with status='posted' (approved and ready to pay)
      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, total_amount, project_id')
        .eq('owner_id', ownerId)
        .eq('status', 'posted');

      if (error) throw error;

      const count = bills?.length || 0;
      const totalAmount = bills?.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0) || 0;
      const projectIds = bills?.map(bill => bill.project_id).filter((id): id is string => id !== null) || [];

      return {
        count,
        totalAmount,
        projectIds: Array.from(new Set(projectIds)), // Remove duplicates
        hasAccess: true,
      };
    },
  });
}
