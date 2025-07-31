import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IssueCounts {
  [category: string]: number;
}

export function useIssueCounts() {
  return useQuery({
    queryKey: ['issue-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_issues')
        .select('category')
        .eq('status', 'Open'); // Only count open issues

      if (error) throw error;

      // Count issues by category
      const counts: IssueCounts = {};
      data.forEach((issue) => {
        counts[issue.category] = (counts[issue.category] || 0) + 1;
      });

      return counts;
    },
  });
}