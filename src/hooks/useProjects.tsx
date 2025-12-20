
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Project {
  id: string;
  address: string;
  status: string;
  construction_manager: string;
  accounting_manager?: string;
  accounting_software?: string;
  total_lots?: number;
  display_order?: number;
  last_schedule_published_at?: string;
  created_at: string;
  updated_at: string;
  accounting_manager_user?: {
    first_name: string;
    last_name: string;
  } | null;
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
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Get unique accounting manager IDs
      const managerIds = [...new Set(
        projectsData
          ?.map(p => p.accounting_manager)
          .filter((id): id is string => !!id)
      )];

      // Fetch user names for accounting managers
      let managersMap: Record<string, { first_name: string; last_name: string }> = {};
      if (managerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', managerIds);

        if (usersData) {
          managersMap = usersData.reduce((acc, u) => {
            acc[u.id] = { first_name: u.first_name || '', last_name: u.last_name || '' };
            return acc;
          }, {} as Record<string, { first_name: string; last_name: string }>);
        }
      }

      // Combine projects with manager user data
      const projects: Project[] = (projectsData || []).map(p => ({
        ...p,
        accounting_manager_user: p.accounting_manager 
          ? managersMap[p.accounting_manager] || null 
          : null,
      }));

      console.log("useProjects: Found projects:", projects.length);
      return projects;
    },
    enabled: !!user,
  });
};
