
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AllPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  project_name?: string;
}

export const useAllPhotos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-photos', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_photos')
        .select(`
          *,
          projects!inner(name)
        `)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching all photos:', error);
        throw error;
      }

      return data.map(photo => ({
        ...photo,
        project_name: photo.projects?.name
      })) as AllPhoto[];
    },
    enabled: !!user,
  });
};
