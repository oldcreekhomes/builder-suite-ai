import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";

interface CostCodeSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CostCodeSearchInput({ 
  value, 
  onChange, 
  placeholder = "Cost Code",
  className 
}: CostCodeSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { searchCostCodes, loading } = useCostCodeSearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const filteredCostCodes = searchQuery.length >= 3 ? searchCostCodes(searchQuery) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(newValue.length >= 3);
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= 3) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectCostCode = (costCode: { code: string; name: string }) => {
    const selectedValue = `${costCode.code} - ${costCode.name}`;
    setSearchQuery(selectedValue);
    onChange(selectedValue);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className}
      />
      
      {showResults && filteredCostCodes.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-32 w-full overflow-auto rounded border bg-background shadow-sm">
          {filteredCostCodes.slice(0, 5).map((costCode) => (
            <button
              key={costCode.id}
              type="button"
              className="block w-full px-2 py-1 text-left text-xs hover:bg-muted"
              onMouseDown={() => handleSelectCostCode(costCode)}
            >
              <span className="font-medium">{costCode.code}</span>
              <span className="text-muted-foreground"> - {costCode.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}