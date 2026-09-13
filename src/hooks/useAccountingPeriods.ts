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

      const ownerId = userData?.role === 'employee'
        ? userData.home_builder_id
        : user.id;

      if (!ownerId) throw new Error('Unable to determine company');

      // Check if period already exists (re-closing scenario)
      const { data: existingPeriod } = await supabase
        .from('accounting_periods')
        .select('id, status')
        .eq('owner_id', ownerId)
        .eq('project_id', projectId)
        .eq('period_end_date', periodEndDate)
        .maybeSingle();

      if (existingPeriod && existingPeriod.status === 'open') {
        // Re-close existing period
        const { data, error } = await supabase
          .from('accounting_periods')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: user.id,
            closure_notes: closureNotes,
            reopened_at: null,
            reopened_by: null,
            reopen_reason: null,
          })
          .eq('id', existingPeriod.id)
          .select()
          .single();

        if (error) throw error;

        // Auto-close any earlier periods still marked 'open'
        await supabase
          .from('accounting_periods')
          .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user.id })
          .eq('owner_id', ownerId)
          .eq('project_id', projectId)
          .eq('status', 'open')
          .lt('period_end_date', periodEndDate);

        return data;
      } else if (existingPeriod && existingPeriod.status === 'closed') {
        throw new Error('This period is already closed');
      }

      // First-time close: insert new period
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

      // Auto-close any earlier periods still marked 'open'
      await supabase
        .from('accounting_periods')
        .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user.id })
        .eq('owner_id', ownerId)
        .eq('project_id', projectId)
        .eq('status', 'open')
        .lt('period_end_date', periodEndDate);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      queryClient.invalidateQueries({ queryKey: ['latest-closed-periods'] });
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

      // Enforce newest-first reopening within the period's project
      const { data: target, error: targetError } = await supabase
        .from('accounting_periods')
        .select('id, project_id, period_end_date, status')
        .eq('id', periodId)
        .single();

      if (targetError) throw targetError;
      if (target.status !== 'closed') throw new Error('This period is not closed');

      const { data: closedPeriods, error: closedError } = await supabase
        .from('accounting_periods')
        .select('id, period_end_date')
        .eq('project_id', target.project_id)
        .eq('status', 'closed')
        .order('period_end_date', { ascending: false })
        .limit(1);

      if (closedError) throw closedError;

      const newest = closedPeriods?.[0];
      if (newest && newest.id !== periodId) {
        const [y, m, d] = newest.period_end_date.split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        });
        throw new Error(
          `You must reopen periods newest first. Reopen ${label} before this one.`
        );
      }


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
      queryClient.invalidateQueries({ queryKey: ['latest-closed-periods'] });
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
