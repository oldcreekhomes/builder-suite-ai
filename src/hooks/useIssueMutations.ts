import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreateIssueData {
  title: string;
  description?: string | null;
  category: string;
  priority: 'Normal' | 'High';
}

interface UpdateIssueData {
  id: string;
  title?: string;
  description?: string | null;
  priority?: 'Normal' | 'High';
}

interface UpdateIssueStatusData {
  id: string;
  status: 'Open' | 'Resolved';
}

export function useIssueMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createIssue = useMutation({
    mutationFn: async (data: CreateIssueData) => {
      // Get current user's company
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      if (!userData?.company_name) throw new Error('User company not found');

      const { data: result, error } = await supabase
        .from('company_issues')
        .insert({
          ...data,
          company_name: userData.company_name,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-issues', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['company-issues'] });
    },
  });

  const updateIssue = useMutation({
    mutationFn: async (data: UpdateIssueData) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from('company_issues')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['company-issues', result.category] });
      queryClient.invalidateQueries({ queryKey: ['company-issues'] });
    },
  });

  const updateIssueStatus = useMutation({
    mutationFn: async (data: UpdateIssueStatusData) => {
      const { data: result, error } = await supabase
        .from('company_issues')
        .update({ status: data.status })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['company-issues', result.category] });
      queryClient.invalidateQueries({ queryKey: ['company-issues'] });
    },
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-issues'] });
    },
  });

  return {
    createIssue,
    updateIssue,
    updateIssueStatus,
    deleteIssue,
  };
}