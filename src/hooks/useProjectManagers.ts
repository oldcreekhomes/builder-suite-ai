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
  name: string;
  status: string;
  manager_id: string;
  manager_name: string;
}

export function useProjectManagers() {
  return useQuery({
    queryKey: ['project-managers'],
    queryFn: async () => {
      // First, get all projects with their managers
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          construction_manager,
          users:construction_manager (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .not('construction_manager', 'is', null);

      if (projectsError) throw projectsError;

      // Group projects by manager and count them
      const managerMap = new Map<string, ProjectManager>();
      const projectsByManager = new Map<string, ProjectWithManager[]>();

      projects?.forEach((project) => {
        if (project.users && project.construction_manager) {
          const manager = project.users;
          const managerId = project.construction_manager;
          
          // Update manager count
          if (!managerMap.has(managerId)) {
            managerMap.set(managerId, {
              id: managerId,
              first_name: manager.first_name || '',
              last_name: manager.last_name || '',
              email: manager.email,
              avatar_url: manager.avatar_url,
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
            name: project.name,
            status: project.status,
            manager_id: managerId,
            manager_name: `${manager.first_name} ${manager.last_name}`.trim() || manager.email
          });
          projectsByManager.set(managerId, managerProjects);
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
        .select('id, name, status')
        .eq('construction_manager', managerId);

      if (error) throw error;
      return projects || [];
    },
    enabled: !!managerId,
  });
}