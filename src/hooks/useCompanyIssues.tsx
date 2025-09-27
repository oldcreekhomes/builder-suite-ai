import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyIssue {
  id: string;
  company_name: string;
  title: string;
  description: string | null;
  category: string;
  status: 'Open' | 'Resolved';
  priority: 'Normal' | 'High';
  created_by: string;
  created_at: string;
  updated_at: string;
  solution?: string | null;
  solution_files?: string[];
}

export function useCompanyIssues(category: string) {
  return useQuery({
    queryKey: ['company-issues', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_issues')
        .select('*')
        .eq('category', category)
        .order('priority', { ascending: false }) // High priority first
        .order('created_at', { ascending: false }); // Most recent first within same priority

      if (error) throw error;
      return data as CompanyIssue[];
    },
  });
}

export function useAllCompanyIssues() {
  return useQuery({
    queryKey: ['company-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_issues')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CompanyIssue[];
    },
  });
}