import { useInfiniteQuery } from "@tanstack/react-query";
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

const PAGE_SIZE = 60;

export const useInfiniteProjectPhotos = (projectId: string) => {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['infinite-project-photos', projectId, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user || !projectId) return [];

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching project photos:', error);
        throw error;
      }

      return data as ProjectPhoto[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!user && !!projectId,
  });
};