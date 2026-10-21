import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { resolveCostCode } from "@/lib/costCodeMatch";

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
  const [mounted, setMounted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelectedRef = useRef(false);
  // Text of the cost code that is really attached (loaded or picked).
  const confirmedRef = useRef(value);
  // Last text we emitted while the user was typing, so we can tell typed
  // values apart from values the parent loaded or set itself.
  const typedRef = useRef<string | null>(null);
  const { costCodes, loading } = useCostCodeSearch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSearchQuery(value);
    if (typedRef.current === null || value !== typedRef.current) {
      confirmedRef.current = value;
      typedRef.current = null;
    }
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

  // Show all cost codes when empty, filter when user types
  const filteredCostCodes = searchQuery.trim().length === 0
    ? costCodes
    : (() => {
        const tokens = searchQuery.toLowerCase().split(/[-:\s]+/).filter(Boolean);
        return costCodes.filter(cc => 
          tokens.every(t =>
            cc.code.toLowerCase().includes(t) || cc.name.toLowerCase().includes(t)
          )
        );
      })();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInvalid(false);
    setSearchQuery(newValue);
    typedRef.current = newValue;
    onChange(newValue);
    setShowResults(true);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  /** Picks the typed cost code, or puts back the real one so the box never lies. */
  const attemptAutoSelect = () => {
    if (!onCostCodeSelect) return;
    if (typedRef.current === null) return; // nothing typed since last confirm

    const match = resolveCostCode(searchQuery, costCodes);
    if (match) {
      handleSelectCostCode(match);
      return;
    }

    // Still loading the list — don't revert on incomplete data.
    if (loading || costCodes.length === 0) return;

    const restore = confirmedRef.current || "";
    if (searchQuery.trim() !== restore.trim()) {
      setSearchQuery(restore);
      typedRef.current = null;
      onChange(restore);
      if (searchQuery.trim()) setInvalid(true);
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

  const handleSelectCostCode = (costCode: { id: string; code: string; name: string }) => {
    justSelectedRef.current = true;
    const selectedValue = `${costCode.code} - ${costCode.name}`;
    setInvalid(false);
    setSearchQuery(selectedValue);
    confirmedRef.current = selectedValue;
    typedRef.current = null;
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
        aria-invalid={invalid || undefined}
        title={invalid ? "Pick a cost code from the list" : undefined}
        className={cn(className, invalid && "border-destructive focus-visible:ring-destructive")}
      />
      
      {mounted && showResults && filteredCostCodes.length > 0 && createPortal(
        <div 
          style={{
            position: "fixed",
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
          {filteredCostCodes.map((costCode) => (
            <button
              key={costCode.id}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleSelectCostCode(costCode); 
              }}
            >
              <div className="font-medium">{costCode.code} - {costCode.name}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
      
      {mounted && showResults && loading && createPortal(
        <div 
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 2147483647,
          }}
          className="rounded-md border bg-popover p-4 shadow-lg"
        >
          <div className="text-sm text-muted-foreground">Loading cost codes...</div>
        </div>,
        document.body
      )}
      
      {mounted && showResults && !loading && filteredCostCodes.length === 0 && searchQuery.trim().length > 0 && createPortal(
        <div 
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 2147483647,
          }}
          className="rounded-md border bg-popover p-4 shadow-lg"
        >
          <div className="text-sm text-muted-foreground">No cost codes found</div>
        </div>,
        document.body
      )}
    </div>
  );
}