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

/**
 * Fetch only the most recent photos for dashboard display
 * Much more efficient than fetching all photos
 */
export const useRecentPhotos = (limit: number = 8) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-photos', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_photos')
        .select(`
          *,
          projects!inner(address)
        `)
        .order('uploaded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent photos:', error);
        throw error;
      }

      return data.map(photo => ({
        ...photo,
        project_name: photo.projects?.address
      })) as RecentPhoto[];
    },
    enabled: !!user,
  });
};
