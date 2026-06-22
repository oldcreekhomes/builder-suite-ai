
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Star, Plus, Trash2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { groupAccountsByParent } from "@/lib/accountHierarchy";
import { useProjectAccountNames, resolveAccountName } from "@/hooks/useProjectAccountNames";
import { AddProjectAccountDialog } from "@/components/AddProjectAccountDialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

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
  subtype?: string | null;
  project_id?: string | null;
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
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProjectAccount = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    // Block delete if the account has any activity in this project
    const { data: activity, error: actErr } = await supabase
      .from('journal_entry_lines')
      .select('id')
      .eq('account_id', deleteTarget.id)
      .eq('project_id', projectId)
      .limit(1);
    if (actErr) {
      setIsDeleting(false);
      toast({ title: "Error", description: actErr.message, variant: "destructive" });
      return;
    }
    if ((activity ?? []).length > 0) {
      setIsDeleting(false);
      setDeleteTarget(null);
      toast({
        title: "Cannot delete account",
        description: `${deleteTarget.code} ${deleteTarget.name} has activity in this project. Reassign or remove the activity first.`,
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('project_id', projectId);
    setIsDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Account deleted" });
    queryClient.invalidateQueries({ queryKey: ['accounts-for-project-selection', projectId] });
    queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    queryClient.invalidateQueries({ queryKey: ['income-statement'] });
  };

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-for-project-selection', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type, parent_id, subtype, project_id')
        .eq('is_active', true)
        .or(`project_id.is.null,project_id.eq.${projectId}`)
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

  const { data: projectDefaultBankId } = useQuery({
    queryKey: ['project-default-bank-account', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_default_bank_accounts' as any)
        .select('account_id')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.account_id as string | null) ?? null;
    },
  });

  const { data: projectDefaultDepositId } = useQuery({
    queryKey: ['project-default-deposit-account', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_default_deposit_accounts' as any)
        .select('account_id')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.account_id as string | null) ?? null;
    },
  });
  const { data: overrides } = useProjectAccountNames(projectId);

  const setNameOverrideMutation = useMutation({
    mutationFn: async ({ accountId, name, originalName }: { accountId: string; name: string; originalName: string }) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === originalName) {
        // Remove override row (reset to global)
        const { error } = await supabase
          .from('project_account_overrides' as any)
          .delete()
          .eq('project_id', projectId)
          .eq('account_id', accountId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('project_account_overrides' as any)
        .upsert(
          { project_id: projectId, account_id: accountId, display_name: trimmed } as any,
          { onConflict: 'project_id,account_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-account-overrides', projectId] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to rename account: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
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

  const setDefaultBankMutation = useMutation({
    mutationFn: async ({ accountId, clear }: { accountId: string; clear: boolean }) => {
      if (clear) {
        const { error } = await supabase
          .from('project_default_bank_accounts' as any)
          .delete()
          .eq('project_id', projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_default_bank_accounts' as any)
          .upsert(
            { project_id: projectId, account_id: accountId, updated_at: new Date().toISOString() } as any,
            { onConflict: 'project_id' }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-default-bank-account', projectId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-defaults'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update default bank account: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const setDefaultDepositMutation = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const { error } = await supabase
        .from('project_default_deposit_accounts' as any)
        .upsert(
          { project_id: projectId, account_id: accountId, updated_at: new Date().toISOString() } as any,
          { onConflict: 'project_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-default-deposit-account', projectId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update default deposit account: ${error?.message || 'Unknown error'}`,
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

  const availableBankAccounts = useMemo(() => {
    return (accounts ?? []).filter(
      (a) => a.type === 'asset' && a.subtype === 'bank' && !exclusions?.has(a.id)
    );
  }, [accounts, exclusions]);

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
    const isProjectScoped = !!account.project_id;
    const isExcluded = !isProjectScoped && (exclusions?.has(account.id) ?? false);
    const isBank = account.subtype === 'bank';
    const isDefaultBank = isBank && projectDefaultBankId === account.id;
    const isDepositControlRow = account.type === 'asset' && account.code === '1020' && account.name.toLowerCase() === 'deposits';
    const overrideName = overrides?.get(account.id);
    const displayName = overrideName ?? account.name;
    const isOverridden = !!overrideName && overrideName !== account.name;
    return (
      <div
        key={account.id}
        className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/50 rounded text-sm"
        style={{ paddingLeft: `${(depth + 1) * 16}px` }}
      >
        {isProjectScoped ? (
          <span className="inline-block w-4 shrink-0" aria-hidden />
        ) : (
          <Checkbox
            checked={!isExcluded}
            onCheckedChange={async (checked) => {
              const wantExclude = !checked;
              if (wantExclude) {
                // Guard: block disabling an account that has non-zero project activity
                const { data, error } = await supabase
                  .from('journal_entry_lines')
                  .select('debit, credit')
                  .eq('account_id', account.id)
                  .eq('project_id', projectId);
                if (error) {
                  toast({
                    title: "Error",
                    description: `Failed to verify account balance: ${error.message}`,
                    variant: "destructive",
                  });
                  return;
                }
                const totalDebit = Math.round(
                  (data ?? []).reduce((s, l: any) => s + Number(l.debit || 0), 0) * 100
                ) / 100;
                const totalCredit = Math.round(
                  (data ?? []).reduce((s, l: any) => s + Number(l.credit || 0), 0) * 100
                ) / 100;
                const balance = Math.round((totalDebit - totalCredit) * 100) / 100;
                if (Math.abs(balance) > 0.005) {
                  const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(balance);
                  toast({
                    title: "Cannot disable account",
                    description: `${account.code} ${account.name} has a project balance of ${formatted}. Clear or reassign the activity before disabling.`,
                    variant: "destructive",
                  });
                  return;
                }
              }
              toggleMutation.mutate({
                accountId: account.id,
                exclude: wantExclude,
              });
            }}
            disabled={toggleMutation.isPending}
          />
        )}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {depth > 0 && <span className="text-muted-foreground mr-1">↳</span>}
          <span className="shrink-0">{account.code} -</span>
          <EditableAccountName
            value={displayName}
            originalName={account.name}
            isOverridden={isOverridden}
            onSave={(name) =>
              setNameOverrideMutation.mutate({
                accountId: account.id,
                name,
                originalName: account.name,
              })
            }
          />
          {isProjectScoped && (
            <Badge variant="secondary" className="ml-2 shrink-0 text-[10px] font-normal">
              Project only
            </Badge>
          )}
        </div>

        {isProjectScoped && (
          <button
            type="button"
            onClick={() => setDeleteTarget(account)}
            className="inline-flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete project-only account"
            title="Delete this project-only account"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {isBank && !isExcluded && (
          <button
            type="button"
            onClick={() =>
              setDefaultBankMutation.mutate({
                accountId: account.id,
                clear: isDefaultBank,
              })
            }
            disabled={setDefaultBankMutation.isPending}
            className="inline-flex items-center justify-center shrink-0"
            aria-label={isDefaultBank ? 'Clear project default bank' : 'Set as project default bank'}
            title={isDefaultBank ? 'Project default bank — click to clear' : 'Set as project default bank'}
          >
            <Star
              className={`h-4 w-4 ${isDefaultBank ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
            />
          </button>
        )}
        {isDepositControlRow && !isExcluded && (
          <Select
            value={projectDefaultDepositId ?? ''}
            onValueChange={(val) =>
              setDefaultDepositMutation.mutate({ accountId: val })
            }
            disabled={setDefaultDepositMutation.isPending || availableBankAccounts.length === 0}
          >
            <SelectTrigger
              className="h-8 w-fit min-w-[10rem] max-w-[14rem] bg-background px-2"
              aria-label="Default deposit bank account"
            >
              <SelectValue placeholder="Bank" />
            </SelectTrigger>
            <SelectContent>
              {availableBankAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-muted-foreground">
          Uncheck accounts that are not applicable to this project. Excluded accounts won't appear on the Balance Sheet or Income Statement.
        </p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </div>

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
                    {renderAccountRow(account as Account, 0)}
                    {childrenMap[account.id]?.map((child) => renderAccountRow(child as Account, 1))}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <AddProjectAccountDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingAccounts={accounts ?? []}
      />

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete project-only account"
        description={deleteTarget ? `Permanently delete ${deleteTarget.code} - ${deleteTarget.name} from this project? This cannot be undone.` : ''}
        onConfirm={deleteProjectAccount}
        isLoading={isDeleting}
      />
    </div>
  );
}

interface EditableAccountNameProps {
  value: string;
  originalName: string;
  isOverridden: boolean;
  onSave: (name: string) => void;
}

function EditableAccountName({ value, originalName, isOverridden, onSave }: EditableAccountNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onSave(next || originalName);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 py-0 px-2 text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={isOverridden ? `Click to edit (global name: ${originalName})` : 'Click to rename for this project'}
      className="truncate text-left hover:underline"
    >
      {value}
    </button>
  );
}


