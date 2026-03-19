import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export function useCostCodeSubcategories(parentCode: string | undefined) {
  return useQuery({
    queryKey: ['cost-code-subcategories', parentCode],
    queryFn: async (): Promise<CostCode[]> => {
      if (!parentCode) return [];

      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('parent_group', parentCode)
        .order('code');

      if (error) throw error;
      return data || [];
    },
    enabled: !!parentCode,
    staleTime: 60000,
  });
}
