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
          projects!project_budgets_project_id_fkey(id, address)
        `)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);
      
      if (error) throw error;
      
      const suffixes = /\b(street|avenue|boulevard|drive|lane|road|court|circle|place|way|trail|terrace|parkway)\b\.?/gi;
      const suffixMap: Record<string, string> = {
        street: 'St', avenue: 'Ave', boulevard: 'Blvd', drive: 'Dr',
        lane: 'Ln', road: 'Rd', court: 'Ct', circle: 'Cir',
        place: 'Pl', way: 'Way', trail: 'Trl', terrace: 'Ter', parkway: 'Pkwy',
      };
      
      const formatAddress = (full: string): string => {
        // Take only the part before the first comma (strip city/state/zip)
        let street = full.split(',')[0].trim();
        // Remove periods from directionals like "N." → "N"
        street = street.replace(/\b([NSEW])\./gi, '$1');
        // Abbreviate street suffixes
        street = street.replace(suffixes, (m) => suffixMap[m.replace('.', '').toLowerCase()] || m);
        return street;
      };

      // Get unique projects that have actual costs
      const uniqueProjects = data.reduce((acc: any[], item) => {
        const existingProject = acc.find(p => p.id === item.project_id);
        if (!existingProject) {
          acc.push({
            id: item.project_id,
            address: formatAddress(item.projects.address || '')
          });
        }
        return acc;
      }, []);
      
      return uniqueProjects;
    },
  });
}