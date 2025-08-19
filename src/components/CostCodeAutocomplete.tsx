import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";

interface CostCodeAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CostCodeAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search cost codes...",
  className 
}: CostCodeAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const { searchCostCodes, loading } = useCostCodeSearch();
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCostCodes = searchCostCodes(searchQuery);

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    // Only open dropdown if there are at least 3 characters
    setIsOpen(newValue.length >= 3);
  };

  const handleSelectCostCode = (costCode: { code: string; name: string }) => {
    const selectedValue = `${costCode.code} - ${costCode.name}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(searchQuery.length >= 3)}
          placeholder={placeholder}
          className={cn("pr-8", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : filteredCostCodes.length > 0 ? (
            filteredCostCodes.map((costCode) => (
              <button
                key={costCode.id}
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                onClick={() => handleSelectCostCode(costCode)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{costCode.code}</span>
                  <span className="text-xs text-muted-foreground">{costCode.name}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              No cost codes found
            </div>
          )}
        </div>
      )}
    </div>
  );
}