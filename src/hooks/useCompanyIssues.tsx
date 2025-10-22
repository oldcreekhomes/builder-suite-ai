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
  location?: string | null;
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
      // Get current user's company info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('role, company_name, home_builder_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Determine the company name to filter by
      let companyName = userProfile.company_name;
      if (userProfile.home_builder_id) {
        const { data: homeBuilder, error: homeBuilderError } = await supabase
          .from('users')
          .select('company_name')
          .eq('id', userProfile.home_builder_id)
          .single();
        
        if (homeBuilderError) throw homeBuilderError;
        companyName = homeBuilder.company_name;
      }

      if (!companyName) throw new Error('No company found for user');

      // Query issues for this company and category
      const { data, error } = await supabase
        .from('company_issues')
        .select('*')
        .eq('category', category)
        .eq('company_name', companyName)
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
      // Get current user's company info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('role, company_name, home_builder_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Determine the company name to filter by
      let companyName = userProfile.company_name;
      if (userProfile.home_builder_id) {
        const { data: homeBuilder, error: homeBuilderError } = await supabase
          .from('users')
          .select('company_name')
          .eq('id', userProfile.home_builder_id)
          .single();
        
        if (homeBuilderError) throw homeBuilderError;
        companyName = homeBuilder.company_name;
      }

      if (!companyName) throw new Error('No company found for user');

      // Query all issues for this company
      const { data, error } = await supabase
        .from('company_issues')
        .select('*')
        .eq('company_name', companyName)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CompanyIssue[];
    },
  });
}