import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";

interface AccountSearchInputInlineProps {
  value: string;
  onChange: (value: string) => void;
  onAccountSelect?: (account: { id: string; code: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  accountType?: string;
}

export function AccountSearchInputInline({ 
  value, 
  onChange, 
  onAccountSelect,
  placeholder = "Account",
  className,
  accountType
}: AccountSearchInputInlineProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { accounts, isLoading } = useAccounts();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Filter accounts by type and search query
  const filteredAccounts = searchQuery.trim().length >= 1 
    ? (accounts || [])
        .filter(acc => !accountType || acc.type === accountType)
        .filter(acc => 
          acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

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
    // Try auto-select on blur if there's a clear match
    attemptAutoSelect();
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectAccount = (account: { id: string; code: string; name: string }) => {
    const selectedValue = `${account.code} - ${account.name}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setShowResults(false);
    if (onAccountSelect) {
      onAccountSelect(account);
    }
  };

  const normalize = (s: string) => s.trim().toLowerCase();
  const attemptAutoSelect = () => {
    const q = searchQuery.trim();
    if (!q) return;

    const lc = normalize(q);

    // Try exact code or full "code - name" match
    const exact = (accounts || []).find(acc => {
      const code = acc.code ?? '';
      const name = acc.name ?? '';
      const full = `${code} - ${name}`;
      return normalize(code) === lc || normalize(full) === lc || normalize(`${code} ${name}`) === lc;
    });

    if (exact) {
      handleSelectAccount({ id: String(exact.id), code: exact.code, name: exact.name });
      return;
    }

    // If typing uniquely identifies one filtered account, select it
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
        <div className="absolute z-50 mt-1 max-h-32 w-full overflow-auto rounded border bg-background shadow-sm">
          {filteredAccounts.slice(0, 5).map((account) => (
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
              <div className="font-medium">{account.code} - {account.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
