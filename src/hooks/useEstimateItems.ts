import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type EstimateItem = Tables<'takeoff_project_estimate_items'>;

export function useEstimateItems(takeoffProjectId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['takeoff-estimate-items', takeoffProjectId],
    queryFn: async (): Promise<EstimateItem[]> => {
      if (!takeoffProjectId) return [];
      const { data, error } = await supabase
        .from('takeoff_project_estimate_items')
        .select('*')
        .eq('takeoff_project_id', takeoffProjectId)
        .order('cost_code_label')
        .order('item_label');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!takeoffProjectId,
    staleTime: 30_000,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EstimateItem> }) => {
      const { error } = await supabase
        .from('takeoff_project_estimate_items')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['takeoff-estimate-items', takeoffProjectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('takeoff_project_estimate_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['takeoff-estimate-items', takeoffProjectId] }),
  });

  const add = useMutation({
    mutationFn: async (row: Omit<EstimateItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('takeoff_project_estimate_items')
        .insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['takeoff-estimate-items', takeoffProjectId] }),
  });

  return {
    ...query,
    updateItem: update.mutate,
    deleteItem: remove.mutate,
    addItem: add.mutate,
  };
}
