
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RecentPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  project_name?: string;
}

export const useRecentPhoto = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-photo', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('project_photos')
        .select(`
          *,
          projects!inner(name)
        `)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No photos found
          return null;
        }
        console.error('Error fetching recent photo:', error);
        throw error;
      }

      return {
        ...data,
        project_name: data.projects?.name
      } as RecentPhoto;
    },
    enabled: !!user,
  });
};
