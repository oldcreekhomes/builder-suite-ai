import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StatementAccount {
  id: string;
  project_id: string;
  name: string;
  account_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useProjectStatementAccounts(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['project-statement-accounts', projectId];

  const { data: accounts = [], isLoading } = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_statement_accounts')
        .select('id, project_id, name, account_id, sort_order, is_active')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as StatementAccount[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
  };

  const onError = (error: any) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  };

  const createAccount = useMutation({
    mutationFn: async ({ name, accountId }: { name: string; accountId?: string | null }) => {
      const nextOrder = accounts.length ? Math.max(...accounts.map(a => a.sort_order)) + 1 : 0;
      const { error } = await supabase.from('project_statement_accounts').insert({
        project_id: projectId,
        name: name.trim(),
        account_id: accountId || null,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StatementAccount> & { id: string }) => {
      const { error } = await supabase
        .from('project_statement_accounts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_statement_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });

  const reorderAccounts = useMutation({
    mutationFn: async (ordered: StatementAccount[]) => {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].sort_order === i) continue;
        const { error } = await supabase
          .from('project_statement_accounts')
          .update({ sort_order: i })
          .eq('id', ordered[i].id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError,
  });

  return {
    accounts,
    activeAccounts: accounts.filter(a => a.is_active),
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
  };
}
