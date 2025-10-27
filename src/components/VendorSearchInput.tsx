import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCompanySearch } from "@/hooks/useCompanySearch";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Plus } from "lucide-react";

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { companies, loading } = useCompanySearch();

  useEffect(() => {
    if (value) {
      // First, try to find by ID (UUID)
      const companyById = companies.find(c => c.id === value);
      if (companyById) {
        setSearchQuery(companyById.company_name);
      } else {
        // If not found by ID, treat value as a plain text name
        // This handles legacy data or free-form text entries
        const companyByName = companies.find(c => 
          c.company_name.toLowerCase() === value.toLowerCase()
        );
        if (companyByName) {
          setSearchQuery(companyByName.company_name);
        } else {
          // No matching company found - display as free-form text
          setSearchQuery(value);
        }
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
    // Only show results if there's already a search query
    if (searchQuery) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for selection
    setTimeout(() => setShowResults(false), 200);
  };

  const handleSelectCompany = (company: { id: string; company_name: string; company_type?: string; address?: string }) => {
    setSearchQuery(company.company_name);
    onChange(company.id); // Pass company UUID for database operations
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
            <div className="p-2">
              <div className="p-2 text-sm text-muted-foreground mb-2">
                No vendors found matching "{searchQuery}"
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAddDialog(true);
                  setShowResults(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Vendor "{searchQuery}"
              </Button>
            </div>
          )}
        </div>
      )}
      
      <AddCompanyDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        initialCompanyName={searchQuery}
        onCompanyCreated={(companyId, companyName) => {
          // Auto-select the newly created vendor
          setSearchQuery(companyName);
          onChange(companyId);
          setShowAddDialog(false);
          
          // Call the parent callback if provided
          if (onCompanySelect) {
            onCompanySelect({
              company_name: companyName,
              address: undefined
            });
          }
        }}
      />
    </div>
  );
}