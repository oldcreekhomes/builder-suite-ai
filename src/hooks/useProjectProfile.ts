import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type TakeoffProjectProfile = Tables<'takeoff_project_profiles'>;

export function useProjectProfile(takeoffProjectId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['takeoff-project-profile', takeoffProjectId],
    queryFn: async (): Promise<TakeoffProjectProfile | null> => {
      if (!takeoffProjectId) return null;
      const { data, error } = await supabase
        .from('takeoff_project_profiles')
        .select('*')
        .eq('takeoff_project_id', takeoffProjectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!takeoffProjectId,
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<TakeoffProjectProfile>) => {
      if (!takeoffProjectId) throw new Error('No takeoff project id');
      const { data, error } = await supabase
        .from('takeoff_project_profiles')
        .update(patch)
        .eq('takeoff_project_id', takeoffProjectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['takeoff-project-profile', takeoffProjectId] });
    },
  });

  return { ...query, updateProfile: update.mutate, isUpdating: update.isPending };
}
