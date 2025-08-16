import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ProjectTask } from "./useProjectTasks";

interface BulkHierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

interface BulkPredecessorUpdate {
  id: string;
  predecessor: string[] | string | null;
}

export const useTaskBulkMutations = (projectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bulkUpdateHierarchies = useMutation({
    mutationFn: async (updates: BulkHierarchyUpdate[]) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing bulk hierarchy update for', updates.length, 'tasks');
      
      // Perform individual updates for each task
      const results = [];
      for (const update of updates) {
        const { data, error } = await supabase
          .from('project_schedule_tasks')
          .update({ hierarchy_number: update.hierarchy_number })
          .eq('id', update.id)
          .select('id');

        if (error) {
          console.error('Bulk hierarchy update error:', error);
          throw error;
        }
        
        if (data) results.push(...data);
      }

      return results;
    },
    onError: (error) => {
      console.error('Bulk hierarchy update failed:', error);
    },
  });

  const bulkUpdatePredecessors = useMutation({
    mutationFn: async (updates: BulkPredecessorUpdate[]) => {
      if (!user || updates.length === 0) return [];

      console.log('🔄 Performing bulk predecessor update for', updates.length, 'tasks');
      
      // Perform individual updates for each task
      const results = [];
      for (const update of updates) {
        const predecessorValue = Array.isArray(update.predecessor) 
          ? JSON.stringify(update.predecessor) 
          : update.predecessor;
          
        const { data, error } = await supabase
          .from('project_schedule_tasks')
          .update({ predecessor: predecessorValue })
          .eq('id', update.id)
          .select('id');

        if (error) {
          console.error('Bulk predecessor update error:', error);
          throw error;
        }
        
        if (data) results.push(...data);
      }

      return results;
    },
    onError: (error) => {
      console.error('Bulk predecessor update failed:', error);
    },
  });

  return {
    bulkUpdateHierarchies,
    bulkUpdatePredecessors,
  };
};