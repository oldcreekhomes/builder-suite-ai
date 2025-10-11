import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";

interface CostCodeSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onCostCodeSelect?: (costCode: { id: string; code: string; name: string }) => void;
  placeholder?: string;
  className?: string;
}

export function CostCodeSearchInput({ 
  value, 
  onChange, 
  onCostCodeSelect,
  placeholder = "Cost Code",
  className 
}: CostCodeSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { costCodes, loading } = useCostCodeSearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Show all cost codes when empty, filter when user types
  const filteredCostCodes = searchQuery.trim().length === 0
    ? costCodes
    : (() => {
        const tokens = searchQuery.toLowerCase().split(/[-\s]+/).filter(Boolean);
        return costCodes.filter(cc => 
          tokens.every(t =>
            cc.code.toLowerCase().includes(t) || cc.name.toLowerCase().includes(t)
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
    if (!searchQuery.trim() || !onCostCodeSelect) return;

    // Search against the full costCodes list, not just filtered ones
    const query = searchQuery.trim();
    let codeToMatch = query;
    
    // Extract potential code from input
    if (codeToMatch.includes(' - ')) {
      codeToMatch = codeToMatch.split(' - ')[0].trim();
    } else if (codeToMatch.includes(' ')) {
      codeToMatch = codeToMatch.split(' ')[0].trim();
    }
    
    // Try exact code match first (case-sensitive)
    let match = costCodes.find(cc => cc.code === codeToMatch);
    
    // Try case-insensitive exact code match
    if (!match) {
      match = costCodes.find(cc => cc.code.toLowerCase() === codeToMatch.toLowerCase());
    }
    
    // Try matching full "code - name" or "code name" format
    if (!match) {
      const normalized = query.toLowerCase();
      match = costCodes.find(cc => 
        `${cc.code} - ${cc.name}`.toLowerCase() === normalized ||
        `${cc.code} ${cc.name}`.toLowerCase() === normalized
      );
    }
    
    // If still no match, try tokenized match with exactly one result
    if (!match) {
      const tokens = query.toLowerCase().split(/[-\s]+/).filter(Boolean);
      if (tokens.length > 0) {
        const matches = costCodes.filter(cc => 
          tokens.every(t =>
            cc.code.toLowerCase().includes(t) || cc.name.toLowerCase().includes(t)
          )
        );
        if (matches.length === 1) {
          match = matches[0];
        }
      }
    }
    
    // If we found a match, select it
    if (match) {
      handleSelectCostCode(match);
    }
  };

  const handleInputBlur = () => {
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

  const handleSelectCostCode = (costCode: { id: string; code: string; name: string }) => {
    const selectedValue = `${costCode.code} - ${costCode.name}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setShowResults(false);
    if (onCostCodeSelect) {
      onCostCodeSelect(costCode);
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
      />
      
      {showResults && filteredCostCodes.length > 0 && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
          {filteredCostCodes.map((costCode) => (
            <button
              key={costCode.id}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={() => handleSelectCostCode(costCode)}
            >
              <div className="font-medium">{costCode.code} - {costCode.name}</div>
            </button>
          ))}
        </div>
      )}
      
      {showResults && loading && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 rounded-md border bg-popover p-4 shadow-lg">
          <div className="text-sm text-muted-foreground">Loading cost codes...</div>
        </div>
      )}
      
      {showResults && !loading && filteredCostCodes.length === 0 && searchQuery.trim().length > 0 && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 rounded-md border bg-popover p-4 shadow-lg">
          <div className="text-sm text-muted-foreground">No cost codes found</div>
        </div>
      )}
    </div>
  );
}