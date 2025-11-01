import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AccountingPeriod {
  id: string;
  owner_id: string;
  project_id: string;
  period_end_date: string;
  status: 'open' | 'closed';
  closed_at: string;
  closed_by: string;
  reopened_at?: string;
  reopened_by?: string;
  reopen_reason?: string;
  closure_notes?: string;
}

export const useAccountingPeriods = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: periods, isLoading } = useQuery({
    queryKey: ['accounting-periods', projectId],
    queryFn: async () => {
      let query = supabase
        .from('accounting_periods')
        .select('*')
        .order('period_end_date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AccountingPeriod[];
    },
    enabled: !!projectId,
  });

  const closePeriodMutation = useMutation({
    mutationFn: async ({
      projectId,
      periodEndDate,
      closureNotes,
    }: {
      projectId: string;
      periodEndDate: string;
      closureNotes?: string;
    }) => {
      // First, validate reconciliations
      const { data: validation } = await supabase.rpc('can_close_period', {
        check_project_id: projectId,
        check_date: periodEndDate,
      });

      if (validation && !validation[0]?.can_close) {
        throw new Error(validation[0]?.reason || 'Cannot close period');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get owner_id
      const { data: userData } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', user.id)
        .single();

      const ownerId = userData?.role === 'employee' || userData?.role === 'accountant'
        ? userData.home_builder_id
        : user.id;

      if (!ownerId) throw new Error('Unable to determine company');

      // Then close the period
      const { data, error } = await supabase
        .from('accounting_periods')
        .insert({
          owner_id: ownerId,
          project_id: projectId,
          period_end_date: periodEndDate,
          closure_notes: closureNotes,
          closed_by: user.id,
          status: 'closed',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast({
        title: "Books Closed",
        description: "The accounting period has been closed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reopenPeriodMutation = useMutation({
    mutationFn: async ({
      periodId,
      reopenReason,
    }: {
      periodId: string;
      reopenReason: string;
    }) => {
      if (!reopenReason.trim()) {
        throw new Error('A reason is required to reopen books');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('accounting_periods')
        .update({
          status: 'open',
          reopened_at: new Date().toISOString(),
          reopened_by: user.id,
          reopen_reason: reopenReason,
        })
        .eq('id', periodId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast({
        title: "Books Reopened",
        description: "The accounting period has been reopened.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    periods,
    isLoading,
    closePeriod: closePeriodMutation.mutate,
    reopenPeriod: reopenPeriodMutation.mutate,
    isClosing: closePeriodMutation.isPending,
    isReopening: reopenPeriodMutation.isPending,
  };
};
