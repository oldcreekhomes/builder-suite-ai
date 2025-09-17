
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

export const useProjects = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("useProjects: No user found");
        return [];
      }

      console.log("useProjects: Fetching projects for user", user.id);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      console.log("useProjects: Found projects:", data?.length || 0);
      return data as Project[];
    },
    enabled: !!user,
  });
};
