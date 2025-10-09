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
    queryKey: ['issue-counts-v6'], // Force complete cache refresh
    queryFn: async () => {
      // First get current user's company info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('role, company_name, home_builder_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Determine the company name to filter by
      let companyName = userProfile.company_name;
      if (userProfile.home_builder_id) {
        const { data: homeBuilder, error: homeBuilderError } = await supabase
          .from('users')
          .select('company_name')
          .eq('id', userProfile.home_builder_id)
          .single();
        
        if (homeBuilderError) throw homeBuilderError;
        companyName = homeBuilder.company_name;
      }

      if (!companyName) throw new Error('No company found for user');

      // Now get issues for this company
      const { data, error } = await supabase
        .from('company_issues')
        .select('category, priority')
        .eq('status', 'Open')
        .eq('company_name', companyName);

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