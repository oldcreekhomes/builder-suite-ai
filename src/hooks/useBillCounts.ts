import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BillCounts {
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  payBillsCount: number;
}

export function useBillCounts() {
  return useQuery({
    queryKey: ['bill-approval-counts'],
    queryFn: async (): Promise<BillCounts> => {
      // Get counts for each status
      const [pendingResult, rejectedResult, approvedResult, payBillsResult] = await Promise.all([
        supabase
          .from('bills')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft'),
        
        supabase
          .from('bills')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'void'),
        
        supabase
          .from('bills')
          .select('id', { count: 'exact', head: true })
          .in('status', ['posted', 'paid']),
        
        supabase
          .from('bills')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'posted')
      ]);

      if (pendingResult.error) throw pendingResult.error;
      if (rejectedResult.error) throw rejectedResult.error;
      if (approvedResult.error) throw approvedResult.error;
      if (payBillsResult.error) throw payBillsResult.error;

      return {
        pendingCount: pendingResult.count || 0,
        rejectedCount: rejectedResult.count || 0,
        approvedCount: approvedResult.count || 0,
        payBillsCount: payBillsResult.count || 0
      };
    },
  });
}