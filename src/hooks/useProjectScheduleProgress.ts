import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectScheduleProgress {
  projectId: string;
  overallProgress: number;
  nextMilestone: string | null;
}

export function useProjectScheduleProgress(projectIds: string[]) {
  return useQuery({
    queryKey: ['project-schedule-progress', projectIds],
    queryFn: async (): Promise<Record<string, ProjectScheduleProgress>> => {
      if (!projectIds.length) return {};

      const { data: tasks, error } = await supabase
        .from('project_schedule_tasks')
        .select('id, project_id, task_name, progress, hierarchy_number')
        .in('project_id', projectIds);

      if (error) throw error;

      const progressByProject: Record<string, ProjectScheduleProgress> = {};

      projectIds.forEach(projectId => {
        const projectTasks = tasks?.filter(t => t.project_id === projectId) || [];
        
        // Calculate weighted average progress
        const totalProgress = projectTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
        const overallProgress = projectTasks.length > 0 
          ? Math.round(totalProgress / projectTasks.length) 
          : 0;

        // Find next milestone (first top-level task with progress < 100)
        const topLevelTasks = projectTasks
          .filter(t => t.hierarchy_number && !t.hierarchy_number.includes('.'))
          .sort((a, b) => {
            const aNum = parseInt(a.hierarchy_number || '0');
            const bNum = parseInt(b.hierarchy_number || '0');
            return aNum - bNum;
          });

        const nextMilestone = topLevelTasks.find(t => (t.progress || 0) < 100)?.task_name || null;

        progressByProject[projectId] = {
          projectId,
          overallProgress,
          nextMilestone
        };
      });

      return progressByProject;
    },
    enabled: projectIds.length > 0,
  });
}
