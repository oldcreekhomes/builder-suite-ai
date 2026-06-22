import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useProjectAccountNames, resolveAccountName } from "@/hooks/useProjectAccountNames";
import { supabase } from "@/integrations/supabase/client";

interface AccountSearchInputInlineProps {
  value: string;
  onChange: (value: string) => void;
  onAccountSelect?: (account: { id: string; code: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  accountType?: string;
  projectId?: string;
}

export function AccountSearchInputInline({ 
  value, 
  onChange, 
  onAccountSelect,
  placeholder = "Account",
  className,
  accountType,
  projectId,
}: AccountSearchInputInlineProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { accounts: globalAccounts, isLoading } = useAccounts();
  const { data: overrides } = useProjectAccountNames(projectId);

  const { data: projectAccounts } = useQuery({
    queryKey: ['project-scoped-accounts', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, type, parent_id, subtype, project_id, is_active')
        .eq('is_active', true)
        .eq('project_id', projectId!)
        .order('code');
      if (error) throw error;
      return data ?? [];
    },
  });

  const accounts = (() => {
    const base = globalAccounts ?? [];
    const extra = projectAccounts ?? [];
    if (extra.length === 0) return base;
    const seen = new Set(base.map((a: any) => a.id));
    const merged = [...base, ...extra.filter((a: any) => !seen.has(a.id))];
    return merged.sort((a: any, b: any) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
  })();

  const { data: excludedIds } = useQuery({
    queryKey: ['project-account-exclusions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_account_exclusions')
        .select('account_id')
        .eq('project_id', projectId!);
      if (error) throw error;
      return new Set((data ?? []).map((r: { account_id: string }) => r.account_id));
    },
  });

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const displayNameOf = (acc: { id: string; name: string }) =>
    resolveAccountName(acc, overrides ?? null);

  // Eligible accounts after type + project exclusion filters
  const eligibleAccounts = (accounts || [])
    .filter(acc => !accountType || acc.type === accountType)
    .filter(acc => !excludedIds || !excludedIds.has(acc.id));

  // Filter by search query (against code + override name).
  // If a matched account is a parent, also include all eligible children.
  const filteredAccounts = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 1) return [];
    const directMatches = eligibleAccounts.filter(acc => {
      const n = displayNameOf(acc).toLowerCase();
      return acc.code.toLowerCase().includes(q) || n.includes(q);
    });
    const matchedIds = new Set(directMatches.map((a: any) => a.id));
    const withChildren = [...directMatches];
    for (const acc of eligibleAccounts) {
      const parentId = (acc as any).parent_id;
      if (parentId && matchedIds.has(parentId) && !matchedIds.has(acc.id)) {
        withChildren.push(acc);
        matchedIds.add(acc.id);
      }
    }
    return withChildren.sort((a: any, b: any) =>
      String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
    );
  })();


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(newValue.trim().length >= 1);
  };

  const handleInputFocus = () => {
    if (searchQuery.trim().length >= 1) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    attemptAutoSelect();
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectAccount = (account: { id: string; code: string; name: string }) => {
    const resolvedName = displayNameOf(account);
    const selectedValue = `${account.code} - ${resolvedName}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setShowResults(false);
    if (onAccountSelect) {
      onAccountSelect({ id: account.id, code: account.code, name: resolvedName });
    }
  };

  const normalize = (s: string) => s.trim().toLowerCase();
  const attemptAutoSelect = () => {
    const q = searchQuery.trim();
    if (!q) return;

    const lc = normalize(q);

    const exact = (accounts || []).find(acc => {
      const code = acc.code ?? '';
      const name = displayNameOf(acc);
      const full = `${code} - ${name}`;
      return normalize(code) === lc || normalize(full) === lc || normalize(`${code} ${name}`) === lc;
    });

    if (exact) {
      handleSelectAccount({ id: String(exact.id), code: exact.code, name: exact.name });
      return;
    }

    if (filteredAccounts.length === 1) {
      const a = filteredAccounts[0];
      handleSelectAccount({ id: String(a.id), code: a.code, name: a.name });
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') { attemptAutoSelect(); } }}
        placeholder={placeholder}
        className={className}
      />
      
      {showResults && filteredAccounts.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border bg-background shadow-sm">
          {filteredAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={() => handleSelectAccount({ 
                id: String(account.id), 
                code: account.code, 
                name: account.name 
              })}
            >
              <div className="font-medium">{account.code} - {displayNameOf(account)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
