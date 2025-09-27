import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface CreateIssueData {
  title: string;
  description?: string | null;
  category: string;
  priority: 'Normal' | 'High';
  location?: string;
}

interface UpdateIssueData {
  id: string;
  title?: string;
  description?: string | null;
  priority?: 'Normal' | 'High';
  solution?: string;
  solution_files?: string[];
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

      // Send closure email (non-blocking)
      try {
        console.log('📨 Invoking send-issue-closure-email function...');
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-issue-closure-email', {
          body: {
            authorEmail: author.email,
            authorName: `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email,
            issueTitle: issue.title,
            issueDescription: issue.description,
            issueCategory: issue.category,
            companyName: issue.company_name,
          },
        });
        console.log('📬 send-issue-closure-email result:', { emailResult, emailError });
        if (emailError) {
          console.error('❌ send-issue-closure-email error:', emailError);
          toast({ title: 'Issue closed, email not sent', description: 'We could not send the closure email.' });
        } else if (!emailResult?.success) {
          console.warn('⚠️ send-issue-closure-email returned unsuccessful:', emailResult);
          toast({ title: 'Issue closed, email status unknown', description: 'Email provider did not confirm sending.' });
        } else {
          toast({ title: 'Issue closed', description: `A confirmation email was sent to ${author.email}.` });
        }
      } catch (emailError) {
        console.error('Failed to send closure email:', emailError);
        // Don't fail the deletion if email fails
        toast({ title: 'Issue closed, email failed', description: 'Email could not be sent.' });
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