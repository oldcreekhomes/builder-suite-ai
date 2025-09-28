import { useState, useEffect } from "react";
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
  const { searchCostCodes, loading } = useCostCodeSearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

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

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
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
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={() => handleSelectCostCode(costCode)}
            >
              <div className="font-medium">{costCode.code} - {costCode.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}