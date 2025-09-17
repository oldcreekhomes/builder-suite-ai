import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  construction_manager: string;
  accounting_manager?: string;
  total_lots?: number;
  created_at: string;
  updated_at: string;
}

export const useProject = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      return data as Project;
    },
    enabled: !!user && !!projectId,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true,
  });
};