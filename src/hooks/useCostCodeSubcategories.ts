import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export function useCostCodeSubcategories(parentCode: string | undefined) {
  return useQuery({
    queryKey: ['cost-code-subcategories', parentCode],
    queryFn: async (): Promise<CostCode[]> => {
      if (!parentCode) return [];

      // Tenant-scope to active home builder so platform admins / cross-tenant
      // visibility cannot leak other builders' subcategories.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: info } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = info?.[0]?.is_employee ? info[0].home_builder_id : user.id;
      if (!ownerId) return [];

      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('parent_group', parentCode)
        .eq('owner_id', ownerId)
        .order('code');

      if (error) throw error;
      return data || [];
    },
    enabled: !!parentCode,
    staleTime: 60000,
  });
}
