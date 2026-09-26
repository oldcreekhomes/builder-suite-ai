import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useProjectAccountNames, resolveAccountName } from "@/hooks/useProjectAccountNames";
import { supabase } from "@/integrations/supabase/client";
import { getParentAccountIds, isAccountSelectable } from "@/lib/accountSelectable";

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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width
    });
  };

  useEffect(() => {
    if (!showResults) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showResults]);

  const displayNameOf = (acc: { id: string; name: string }) =>
    resolveAccountName(acc, overrides ?? null);

  // Eligible accounts after type + project exclusion filters
  const eligibleAccounts = (accounts || [])
    .filter(acc => !accountType || acc.type === accountType)
    .filter(acc => !excludedIds || !excludedIds.has(acc.id));

  // Parents with at least one active visible child are not selectable.
  const parentAccountIds = getParentAccountIds(eligibleAccounts);

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
    if (!isAccountSelectable(account, parentAccountIds)) return;
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
      return isAccountSelectable(acc, parentAccountIds) &&
        (normalize(code) === lc || normalize(full) === lc || normalize(`${code} ${name}`) === lc);
    });

    if (exact) {
      handleSelectAccount({ id: String(exact.id), code: exact.code, name: exact.name });
      return;
    }

    if (filteredAccounts.length === 1 && isAccountSelectable(filteredAccounts[0], parentAccountIds)) {
      const a = filteredAccounts[0];
      handleSelectAccount({ id: String(a.id), code: a.code, name: a.name });
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') { attemptAutoSelect(); } }}
        placeholder={placeholder}
        className={className}
      />

      {mounted && showResults && filteredAccounts.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 2147483647,
            maxHeight: '240px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            pointerEvents: 'auto'
          }}
          className="rounded-md border bg-popover shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {filteredAccounts.map((account) => {
            const isParent = !isAccountSelectable(account, parentAccountIds);
            return (
              <button
                key={account.id}
                type="button"
                disabled={isParent}
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm",
                  isParent
                    ? "text-muted-foreground cursor-not-allowed hover:bg-transparent"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onMouseDown={(e) => {
                  if (isParent) return;
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAccount({
                    id: String(account.id),
                    code: account.code,
                    name: account.name
                  });
                }}
              >
                <div className={cn("font-medium", (account as any).parent_id && "pl-4")}>
                  {account.code} - {displayNameOf(account)}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
