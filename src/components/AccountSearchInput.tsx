import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";

interface AccountSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onAccountSelect?: (account: { id: string; code: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  accountType?: 'expense' | 'asset' | 'liability' | 'equity' | 'revenue';
  bankAccountsOnly?: boolean;
  disabled?: boolean;
  projectId?: string;
}

export function AccountSearchInput({ 
  value, 
  onChange, 
  onAccountSelect,
  placeholder = "Search accounts...",
  className,
  accountType,
  bankAccountsOnly = false,
  disabled = false,
  projectId,
}: AccountSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelectedRef = useRef(false);
  const { accounts, isLoading } = useAccounts();

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

  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

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

  // Filter by account type if specified
  const typeFilteredAccounts = accounts.filter(account => {
    if (accountType && account.type !== accountType) return false;

    // Hide accounts excluded from this project's Chart of Accounts
    if (excludedIds && excludedIds.has(account.id)) return false;

    // If bankAccountsOnly is true, restrict to bank-type accounts.
    // Prefer the explicit accounts.subtype = 'bank' classification. Fall back to
    // the legacy heuristic only when no row in the tenant has subtype set yet
    // (graceful migration window).
    if (bankAccountsOnly) {
      const anyHasSubtype = accounts.some((a: any) => a?.subtype);
      if (anyHasSubtype) {
        if ((account as any).subtype !== 'bank') return false;
      } else {
        const code = (account.code ?? '').trim();
        const codeNum = Number(code);
        const inCashRange = Number.isFinite(codeNum) && codeNum >= 1000 && codeNum <= 1039;
        const name = account.name.toLowerCase();
        const keywordMatch =
          name.includes('bank') ||
          name.includes('checking') ||
          name.includes('savings') ||
          name.includes('clearing') ||
          name.includes('cash') ||
          name.includes('money market');
        if (!inCashRange && !keywordMatch) return false;
      }
    }

    return true;
  });


  // Show all accounts when empty, filter when user types
  const filteredAccounts = searchQuery.trim().length === 0
    ? typeFilteredAccounts
    : (() => {
        const tokens = searchQuery.toLowerCase().split(/[-\s]+/).filter(Boolean);
        return typeFilteredAccounts.filter(account => 
          tokens.every(t =>
            account.code.toLowerCase().includes(t) || account.name.toLowerCase().includes(t)
          )
        );
      })();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(true);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  const attemptAutoSelect = () => {
    if (!searchQuery.trim() || !onAccountSelect) return;

    const query = searchQuery.trim();
    let codeToMatch = query;
    
    // Extract potential code from input
    if (codeToMatch.includes(' - ')) {
      codeToMatch = codeToMatch.split(' - ')[0].trim();
    } else if (codeToMatch.includes(' ')) {
      codeToMatch = codeToMatch.split(' ')[0].trim();
    }
    
    // Try exact code match first (case-sensitive)
    let match = typeFilteredAccounts.find(account => account.code === codeToMatch);
    
    // Try case-insensitive exact code match
    if (!match) {
      match = typeFilteredAccounts.find(account => account.code.toLowerCase() === codeToMatch.toLowerCase());
    }
    
    // Try matching full "code - name" or "code name" format
    if (!match) {
      const normalized = query.toLowerCase();
      match = typeFilteredAccounts.find(account => 
        `${account.code} - ${account.name}`.toLowerCase() === normalized ||
        `${account.code} ${account.name}`.toLowerCase() === normalized
      );
    }
    
    // If still no match, try tokenized match with exactly one result
    if (!match) {
      const tokens = query.toLowerCase().split(/[-\s]+/).filter(Boolean);
      if (tokens.length > 0) {
        const matches = typeFilteredAccounts.filter(account => 
          tokens.every(t =>
            account.code.toLowerCase().includes(t) || account.name.toLowerCase().includes(t)
          )
        );
        if (matches.length === 1) {
          match = matches[0];
        }
      }
    }
    
    // If we found a match, select it
    if (match) {
      handleSelectAccount(match);
    }
  };

  const handleInputBlur = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setShowResults(false);
      return;
    }
    // Try to auto-select before hiding results
    attemptAutoSelect();
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptAutoSelect();
      setShowResults(false);
    }
  };

  const handleSelectAccount = (account: { id: string; code: string; name: string }) => {
    justSelectedRef.current = true;
    const selectedValue = `${account.code} - ${account.name}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setShowResults(false);
    if (onAccountSelect) {
      onAccountSelect(account);
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
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
          {filteredAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectAccount(account);
              }}
            >
              <div className="font-medium">{account.code} - {account.name}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
      
      {mounted && showResults && isLoading && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: menuPos.top, 
            left: menuPos.left, 
            width: menuPos.width, 
            zIndex: 2147483647 
          }} 
          className="rounded-md border bg-popover p-4 shadow-lg"
        >
          <div className="text-sm text-muted-foreground">Loading accounts...</div>
        </div>,
        document.body
      )}
      
      {mounted && showResults && !isLoading && filteredAccounts.length === 0 && searchQuery.trim().length > 0 && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: menuPos.top, 
            left: menuPos.left, 
            width: menuPos.width, 
            zIndex: 2147483647 
          }} 
          className="rounded-md border bg-popover p-4 shadow-lg"
        >
          <div className="text-sm text-muted-foreground">No accounts found</div>
        </div>,
        document.body
      )}
    </div>
  );
}
