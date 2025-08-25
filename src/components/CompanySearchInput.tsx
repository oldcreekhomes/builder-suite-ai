import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanySearch } from "@/hooks/useCompanySearch";

interface CompanySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onCompanySelect: (company: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
}

export const CompanySearchInput = ({
  value,
  onChange,
  onCompanySelect,
  placeholder = "Search companies...",
  className,
}: CompanySearchInputProps) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { companies, loading } = useCompanySearch();

  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setShowResults(true);
  };

  const handleSelectCompany = (company: { id: string; company_name: string }) => {
    setSearchQuery(company.company_name);
    onChange(company.company_name);
    setShowResults(false);
    onCompanySelect({ id: company.id, name: company.company_name });
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder={placeholder}
        className={cn("w-full", className)}
      />
      
      {showResults && searchQuery && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : filteredCompanies.length > 0 ? (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="p-2 hover:bg-accent cursor-pointer text-sm"
                onMouseDown={() => handleSelectCompany(company)}
              >
                <div className="font-medium">{company.company_name}</div>
                {company.company_type && (
                  <div className="text-xs text-muted-foreground">{company.company_type}</div>
                )}
              </div>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              No companies found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};