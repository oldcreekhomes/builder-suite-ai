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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchCostCodes, loading } = useCostCodeSearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  useEffect(() => {
    if (showResults && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [showResults]);

  const filteredCostCodes = searchQuery.trim().length >= 1 ? searchCostCodes(searchQuery) : [];

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

  const attemptAutoSelect = () => {
    if (!searchQuery.trim() || !onCostCodeSelect) return;

    // Try to extract a code from the input
    let codeToMatch = searchQuery.trim();
    
    // If input contains " - ", extract the code part before it (e.g., "2220 - Marketing")
    if (codeToMatch.includes(' - ')) {
      codeToMatch = codeToMatch.split(' - ')[0].trim();
    }
    // If input contains space without dash, extract the code part (e.g., "2220 Marketing")
    else if (codeToMatch.includes(' ')) {
      codeToMatch = codeToMatch.split(' ')[0].trim();
    }
    
    // Try exact code match first (preferred)
    let match = filteredCostCodes.find(cc => cc.code === codeToMatch);
    
    // If no exact match, try case-insensitive exact match
    if (!match) {
      match = filteredCostCodes.find(cc => cc.code.toLowerCase() === codeToMatch.toLowerCase());
    }
    
    // If still no match and we have exactly one search result, use it
    if (!match && filteredCostCodes.length === 1) {
      match = filteredCostCodes[0];
    }
    
    // If still no match, try matching full "code - name" format (case-insensitive)
    if (!match) {
      const normalized = searchQuery.toLowerCase().trim();
      match = filteredCostCodes.find(cc => 
        `${cc.code} - ${cc.name}`.toLowerCase() === normalized ||
        `${cc.code} ${cc.name}`.toLowerCase() === normalized
      );
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
        <div 
          className="fixed z-[100] max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 300)}px`
          }}
        >
          {filteredCostCodes.slice(0, 10).map((costCode) => (
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
        <div 
          className="fixed z-[100] rounded-md border bg-popover p-4 shadow-lg"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 300)}px`
          }}
        >
          <div className="text-sm text-muted-foreground">Loading cost codes...</div>
        </div>
      )}
      
      {showResults && !loading && filteredCostCodes.length === 0 && searchQuery.trim().length > 0 && (
        <div 
          className="fixed z-[100] rounded-md border bg-popover p-4 shadow-lg"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${Math.max(dropdownPosition.width, 300)}px`
          }}
        >
          <div className="text-sm text-muted-foreground">No cost codes found</div>
        </div>
      )}
    </div>
  );
}