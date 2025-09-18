import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useBiddingCompanyMutations } from '@/hooks/useBiddingCompanyMutations';

interface AddCompaniesToBidPackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidPackageId: string;
  costCodeId: string;
  projectId: string;
  existingCompanyIds: string[];
}

export function AddCompaniesToBidPackageModal({
  open,
  onOpenChange,
  bidPackageId,
  costCodeId,
  projectId,
  existingCompanyIds
}: AddCompaniesToBidPackageModalProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { addCompanyToBidPackage } = useBiddingCompanyMutations(projectId);

  // Fetch companies associated with this cost code that aren't already in the bid package
  const { data: availableCompanies, isLoading } = useQuery({
    queryKey: ['available-companies-for-bid-package', costCodeId, existingCompanyIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select(`
          company_id,
          companies!company_cost_codes_company_id_fkey (
            id,
            company_name,
            company_type,
            address,
            phone_number
          )
        `)
        .eq('cost_code_id', costCodeId)
        .not('company_id', 'in', `(${existingCompanyIds.length > 0 ? existingCompanyIds.join(',') : 'null'})`);

      if (error) throw error;
      
      return data.map(item => item.companies).filter(Boolean);
    },
    enabled: open && !!costCodeId,
  });

  const filteredCompanies = availableCompanies?.filter(company =>
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.company_type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCompanies.size === filteredCompanies.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(filteredCompanies.map(c => c.id)));
    }
  };

  const handleAddCompanies = async () => {
    for (const companyId of selectedCompanies) {
      await addCompanyToBidPackage.mutateAsync({ bidPackageId, companyId });
    }
    setSelectedCompanies(new Set());
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedCompanies(new Set());
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Companies to Bid Package</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading available companies...</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availableCompanies?.length === 0 
                ? "No additional companies available for this cost code"
                : "No companies match your search"
              }
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center space-x-2 py-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedCompanies.size === filteredCompanies.length && filteredCompanies.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({filteredCompanies.length} companies)
                </label>
              </div>

              {/* Company List */}
              <div className="space-y-2">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={company.id}
                      checked={selectedCompanies.has(company.id)}
                      onCheckedChange={() => handleCompanyToggle(company.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={company.id} className="cursor-pointer">
                        <div className="font-medium">{company.company_name}</div>
                        <div className="text-sm text-muted-foreground">{company.company_type}</div>
                        {company.address && (
                          <div className="text-xs text-muted-foreground">{company.address}</div>
                        )}
                        {company.phone_number && (
                          <div className="text-xs text-muted-foreground">{company.phone_number}</div>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {selectedCompanies.size} companies selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddCompanies}
                disabled={selectedCompanies.size === 0 || addCompanyToBidPackage.isPending}
              >
                {addCompanyToBidPackage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Selected Companies
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}