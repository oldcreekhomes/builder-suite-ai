import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanySearch } from "@/hooks/useCompanySearch";

interface VendorSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onCompanySelect?: (company: { company_name: string; address?: string }) => void;
  placeholder?: string;
  className?: string;
}

export function VendorSearchInput({ 
  value, 
  onChange,
  onCompanySelect,
  placeholder = "Search vendors...",
  className 
}: VendorSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { companies, loading } = useCompanySearch();

  useEffect(() => {
    // Find company name by ID for display
    if (value) {
      const company = companies.find(c => c.id === value);
      if (company) {
        setSearchQuery(company.company_name);
      }
    } else {
      setSearchQuery("");
    }
  }, [value, companies]);

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowResults(true);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectCompany = (company: { id: string; company_name: string; company_type?: string; address?: string }) => {
    setSearchQuery(company.company_name);
    onChange(company.id); // Pass company ID instead of name
    setShowResults(false);
    
    // Call the onCompanySelect callback with company details including address
    if (onCompanySelect) {
      onCompanySelect({
        company_name: company.company_name,
        address: company.address
      });
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
      
      {showResults && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : filteredCompanies.length > 0 ? (
            filteredCompanies.slice(0, 8).map((company) => (
              <button
                key={company.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelectCompany(company)}
              >
                <div className="font-medium">{company.company_name}</div>
              </button>
            ))
          ) : searchQuery && (
            <div className="p-3 text-sm text-muted-foreground">
              No vendors found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}