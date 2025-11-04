import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBudgetLockPermissions } from "./useBudgetLockPermissions";

export const useBudgetLockStatus = (projectId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canLockBudgets } = useBudgetLockPermissions();

  // Fetch lock status
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-lock-status', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('budget_locked, budget_locked_at, budget_locked_by, budget_lock_notes')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Lock budget mutation
  const lockBudgetMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('projects')
        .update({
          budget_locked: true,
          budget_locked_at: new Date().toISOString(),
          budget_locked_by: user.id,
          budget_lock_notes: notes || null,
        })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lock-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: "Budget Locked",
        description: "The budget has been locked successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to lock budget",
        variant: "destructive",
      });
    },
  });

  // Unlock budget mutation
  const unlockBudgetMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const { error } = await supabase
        .from('projects')
        .update({
          budget_locked: false,
          budget_lock_notes: reason || null,
        })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-lock-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: "Budget Unlocked",
        description: "The budget has been unlocked successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unlock budget",
        variant: "destructive",
      });
    },
  });

  return {
    isLocked: project?.budget_locked || false,
    lockedAt: project?.budget_locked_at,
    lockedBy: project?.budget_locked_by,
    lockNotes: project?.budget_lock_notes,
    isLoading,
    canLockBudgets,
    lockBudget: lockBudgetMutation.mutate,
    unlockBudget: unlockBudgetMutation.mutate,
    isLocking: lockBudgetMutation.isPending,
    isUnlocking: unlockBudgetMutation.isPending,
  };
};
