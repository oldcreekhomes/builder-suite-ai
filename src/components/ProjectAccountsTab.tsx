
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { groupAccountsByParent } from "@/lib/accountHierarchy";

interface ProjectAccountsTabProps {
  projectId: string;
}

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
}

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export function ProjectAccountsTab({ projectId }: ProjectAccountsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    asset: true, liability: true, equity: true, revenue: true, expense: true,
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-for-project-selection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type, parent_id')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as Account[];
    },
  });

  const { data: exclusions, isLoading: exclusionsLoading } = useQuery({
    queryKey: ['project-account-exclusions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_account_exclusions')
        .select('account_id')
        .eq('project_id', projectId);
      if (error) throw error;
      return new Set(data.map((e: { account_id: string }) => e.account_id));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ accountId, exclude }: { accountId: string; exclude: boolean }) => {
      if (exclude) {
        const { error } = await supabase
          .from('project_account_exclusions')
          .insert({ project_id: projectId, account_id: accountId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_account_exclusions')
          .delete()
          .eq('project_id', projectId)
          .eq('account_id', accountId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-account-exclusions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update account selection: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const isLoading = accountsLoading || exclusionsLoading;

  // Group accounts by type, then by hierarchy within each type
  const grouped = useMemo(() => {
    if (!accounts) return {} as Record<AccountType, Account[]>;
    return TYPE_ORDER.reduce((acc, type) => {
      acc[type] = accounts.filter((a) => a.type === type);
      return acc;
    }, {} as Record<AccountType, Account[]>);
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const toggleSection = (type: string) => {
    setOpenSections((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const renderAccountRow = (account: Account, depth: number) => {
    const isExcluded = exclusions?.has(account.id) ?? false;
    return (
      <label
        key={account.id}
        className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer text-sm"
        style={{ paddingLeft: `${(depth + 1) * 16}px` }}
      >
        <Checkbox
          checked={!isExcluded}
          onCheckedChange={(checked) => {
            toggleMutation.mutate({
              accountId: account.id,
              exclude: !checked,
            });
          }}
          disabled={toggleMutation.isPending}
        />
        <span>
          {depth > 0 && <span className="text-muted-foreground mr-1">↳</span>}
          {account.code} - {account.name}
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
      <p className="text-sm text-muted-foreground mb-3">
        Uncheck accounts that are not applicable to this project. Excluded accounts won't appear on the Balance Sheet or Income Statement.
      </p>
      {TYPE_ORDER.map((type) => {
        const typeAccounts = grouped[type] || [];
        if (typeAccounts.length === 0) return null;
        const { roots, childrenMap } = groupAccountsByParent(typeAccounts);
        return (
          <Collapsible
            key={type}
            open={openSections[type]}
            onOpenChange={() => toggleSection(type)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-2 hover:bg-muted/50 rounded text-sm font-semibold">
              {openSections[type] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {TYPE_LABELS[type]} ({typeAccounts.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1">
                {roots.map((account) => (
                  <div key={account.id}>
                    {renderAccountRow(account, 0)}
                    {childrenMap[account.id]?.map((child) => renderAccountRow(child, 1))}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
