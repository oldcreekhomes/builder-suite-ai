import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Lightweight hook to get total photo count without fetching all photo data
 */
export const usePhotoCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['photo-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('project_photos')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching photo count:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: !!user,
  });
};
