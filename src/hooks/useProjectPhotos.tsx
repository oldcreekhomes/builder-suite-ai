
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

export const useProjectPhotos = (projectId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['project-photos', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) return [];

      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching project photos:', error);
        throw error;
      }

      console.log('Fetched photos:', data);
      return data as ProjectPhoto[];
    },
    enabled: !!user && !!projectId,
  });
};
