import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useHistoricalProjects() {
  return useQuery({
    queryKey: ['historical-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          project_id,
          projects!inner(id, address)
        `)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);
      
      if (error) throw error;
      
      // Get unique projects that have actual costs
      const uniqueProjects = data.reduce((acc: any[], item) => {
        const existingProject = acc.find(p => p.id === item.project_id);
        if (!existingProject) {
          acc.push({
            id: item.project_id,
            address: item.projects.address
          });
        }
        return acc;
      }, []);
      
      return uniqueProjects;
    },
  });
}