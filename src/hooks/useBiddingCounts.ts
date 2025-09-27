import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BiddingCounts {
  draftCount: number;
  sentCount: number;
  closedCount: number;
}

export function useBiddingCounts(projectId: string) {
  return useQuery({
    queryKey: ['bidding-counts', projectId],
    queryFn: async (): Promise<BiddingCounts> => {
      if (!projectId) {
        return { draftCount: 0, sentCount: 0, closedCount: 0 };
      }

      // Get counts for each status
      const [draftResult, sentResult, closedResult] = await Promise.all([
        supabase
          .from('project_bid_packages')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'draft'),
        
        supabase
          .from('project_bid_packages')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'sent'),
        
        supabase
          .from('project_bid_packages')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'closed')
      ]);

      if (draftResult.error) throw draftResult.error;
      if (sentResult.error) throw sentResult.error;
      if (closedResult.error) throw closedResult.error;

      return {
        draftCount: draftResult.count || 0,
        sentCount: sentResult.count || 0,
        closedCount: closedResult.count || 0
      };
    },
    enabled: !!projectId,
  });
}