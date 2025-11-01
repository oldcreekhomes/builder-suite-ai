import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useIsTransactionLocked = (
  transactionDate: string | Date | undefined,
  projectId: string | undefined,
  ownerId: string | undefined
) => {
  return useQuery({
    queryKey: ['transaction-locked', transactionDate, projectId, ownerId],
    queryFn: async () => {
      if (!transactionDate || !projectId || !ownerId) return false;

      const dateStr = typeof transactionDate === 'string' 
        ? transactionDate 
        : transactionDate.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('is_period_closed', {
        check_date: dateStr,
        check_project_id: projectId,
        check_owner_id: ownerId,
      });

      if (error) {
        console.error('Error checking if period is closed:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!transactionDate && !!projectId && !!ownerId,
  });
};
