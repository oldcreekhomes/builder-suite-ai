import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IssueCounts {
  [category: string]: {
    normal: number;
    high: number;
  };
}

export function useIssueCounts() {
  return useQuery({
    queryKey: ['issue-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_issues')
        .select('category, priority')
        .eq('status', 'Open'); // Only count open issues

      if (error) throw error;

      // Count issues by category and priority
      const counts: IssueCounts = {};
      data.forEach((issue) => {
        if (!counts[issue.category]) {
          counts[issue.category] = { normal: 0, high: 0 };
        }
        
        if (issue.priority === 'High') {
          counts[issue.category].high++;
        } else {
          counts[issue.category].normal++;
        }
      });

      return counts;
    },
  });
}