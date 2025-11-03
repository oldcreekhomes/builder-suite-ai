import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if a date falls within a closed accounting period
 * Returns a function that checks if a specific date is locked
 */
export const useClosedPeriodCheck = (projectId?: string) => {
  // Fetch closed periods for the project
  const { data: closedPeriods, isLoading } = useQuery({
    queryKey: ['closed-periods-check', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('period_end_date, status')
        .eq('project_id', projectId)
        .eq('status', 'closed')
        .order('period_end_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  /**
   * Check if a transaction date is locked (within a closed period)
   * @param transactionDate - The date to check (string in YYYY-MM-DD format)
   * @returns true if the date is locked, false otherwise
   */
  const isDateLocked = (transactionDate: string): boolean => {
    if (!closedPeriods || closedPeriods.length === 0) return false;
    
    // Get the most recent closed period
    const latestClosedPeriod = closedPeriods[0];
    if (!latestClosedPeriod) return false;
    
    // Compare dates - if transaction date is on or before the closed period end date, it's locked
    const txnDate = new Date(transactionDate);
    const closedDate = new Date(latestClosedPeriod.period_end_date);
    
    return txnDate <= closedDate;
  };

  /**
   * Get the latest closed period end date
   */
  const latestClosedDate = closedPeriods && closedPeriods.length > 0 
    ? closedPeriods[0].period_end_date 
    : null;

  return {
    isDateLocked,
    latestClosedDate,
    isLoading,
    hasClosedPeriods: closedPeriods && closedPeriods.length > 0,
  };
};
