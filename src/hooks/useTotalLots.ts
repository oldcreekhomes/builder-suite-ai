import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useTotalLots = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['totalLots', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("useTotalLots: No user found");
        return 0;
      }

      console.log("useTotalLots: Fetching total lots for user", user.id);
      const { data, error } = await supabase
        .from('projects')
        .select('total_lots')
        .not('total_lots', 'is', null);

      if (error) {
        console.error('Error fetching total lots:', error);
        throw error;
      }

      // Sum all total_lots values
      const totalLots = data?.reduce((sum, project) => {
        return sum + (project.total_lots || 0);
      }, 0) || 0;

      console.log("useTotalLots: Total lots calculated:", totalLots);
      return totalLots;
    },
    enabled: !!user,
  });
};