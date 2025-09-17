import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  project_count: number;
}

export interface ProjectWithManager {
  id: string;
  address: string;
  status: string;
  manager_id: string;
  manager_name: string;
}

export function useProjectManagers() {
  return useQuery({
    queryKey: ['project-managers'],
    queryFn: async () => {
      // First, get all projects with accounting managers
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, address, status, accounting_manager')
        .not('accounting_manager', 'is', null);

      if (projectsError) throw projectsError;
      if (!projects?.length) return { managers: [], projectsByManager: {} };

      // Get unique accounting manager IDs
      const managerIds = [...new Set(projects.map(p => p.accounting_manager))];

      // Fetch user details for all accounting managers
      const { data: managers, error: managersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', managerIds);

      if (managersError) throw managersError;

      // Create a map of manager details
      const managerDetailsMap = new Map(managers?.map(m => [m.id, m]) || []);

      // Group projects by manager and count them
      const managerMap = new Map<string, ProjectManager>();
      const projectsByManager = new Map<string, ProjectWithManager[]>();

      projects.forEach((project) => {
        if (project.accounting_manager) {
          const managerId = project.accounting_manager;
          const managerDetails = managerDetailsMap.get(managerId);
          
          if (managerDetails) {
            // Update manager count
            if (!managerMap.has(managerId)) {
              managerMap.set(managerId, {
                id: managerId,
                first_name: managerDetails.first_name || '',
                last_name: managerDetails.last_name || '',
                email: managerDetails.email,
                avatar_url: managerDetails.avatar_url,
                project_count: 0
              });
              projectsByManager.set(managerId, []);
            }
            
            const managerData = managerMap.get(managerId)!;
            managerData.project_count++;
            managerMap.set(managerId, managerData);

            // Add project to manager's list
            const managerProjects = projectsByManager.get(managerId)!;
            managerProjects.push({
              id: project.id,
              address: project.address,
              status: project.status,
              manager_id: managerId,
              manager_name: `${managerDetails.first_name} ${managerDetails.last_name}`.trim() || managerDetails.email
            });
            projectsByManager.set(managerId, managerProjects);
          }
        }
      });

      return {
        managers: Array.from(managerMap.values()).sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        ),
        projectsByManager: Object.fromEntries(projectsByManager)
      };
    },
  });
}

export function useProjectManagerProjects(managerId: string) {
  return useQuery({
    queryKey: ['project-manager-projects', managerId],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, address, status')
        .eq('accounting_manager', managerId);

      if (error) throw error;
      return projects || [];
    },
    enabled: !!managerId,
  });
}