import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanySearch } from "@/hooks/useCompanySearch";

interface VendorSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function VendorSearchInput({ 
  value, 
  onChange, 
  placeholder = "Vendor",
  className 
}: VendorSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { searchCompanies, loading } = useCompanySearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const filteredCompanies = searchQuery.length >= 3 ? searchCompanies(searchQuery) : [];

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

  const handleSelectCompany = (company: { company_name: string; company_type?: string }) => {
    const selectedValue = company.company_name;
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
      
      {showResults && filteredCompanies.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-32 w-full overflow-auto rounded border bg-background shadow-sm">
          {filteredCompanies.slice(0, 5).map((company) => (
            <button
              key={company.id}
              type="button"
              className="block w-full px-2 py-1 text-left text-xs hover:bg-muted"
              onMouseDown={() => handleSelectCompany(company)}
            >
              <span className="font-medium">{company.company_name}</span>
              {company.company_type && (
                <span className="text-muted-foreground"> - {company.company_type}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}