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
      queryClient.invalidateQueries({ queryKey: ['issue-counts-v2'] }); // Invalidate counts
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
      queryClient.invalidateQueries({ queryKey: ['issue-counts-v2'] }); // Invalidate counts
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
      queryClient.invalidateQueries({ queryKey: ['issue-counts-v2'] }); // Invalidate counts
    },
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      // First, get the issue details and author information
      const { data: issue, error: issueError } = await supabase
        .from('company_issues')
        .select('*')
        .eq('id', id)
        .single();

      if (issueError) throw issueError;

      // Get author details
      const { data: author, error: authorError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', issue.created_by)
        .single();

      if (authorError) throw authorError;

      // Send closure email
      try {
        await supabase.functions.invoke('send-issue-closure-email', {
          body: {
            authorEmail: author.email,
            authorName: `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email,
            issueTitle: issue.title,
            issueDescription: issue.description,
            issueCategory: issue.category,
            companyName: issue.company_name,
          },
        });
      } catch (emailError) {
        console.error('Failed to send closure email:', emailError);
        // Don't fail the deletion if email fails
      }

      // Delete the issue
      const { error } = await supabase
        .from('company_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue-counts-v2'] }); // Invalidate counts
    },
  });

  return {
    createIssue,
    updateIssue,
    updateIssueStatus,
    deleteIssue,
  };
}