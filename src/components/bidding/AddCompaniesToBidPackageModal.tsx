import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      let query = supabase
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
        .eq('cost_code_id', costCodeId);

      // Only exclude existing companies if there are any to exclude
      if (existingCompanyIds.length > 0) {
        query = query.not('company_id', 'in', `(${existingCompanyIds.join(',')})`);
      }

      const { data, error } = await query;

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
        
        <div className="flex-1 overflow-auto space-y-3">
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
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading available companies...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 h-64">
              {/* Available Companies */}
              <div className="p-3">
                <h3 className="font-medium mb-2">Available Companies</h3>
                <div className="space-y-1 max-h-52 overflow-auto">
                  {filteredCompanies
                    .filter(company => !selectedCompanies.has(company.id))
                    .map((company) => (
                      <div 
                        key={company.id} 
                        className="p-2 cursor-pointer hover:bg-muted transition-colors text-sm"
                        onClick={() => handleCompanyToggle(company.id)}
                      >
                        {company.company_name}
                      </div>
                    ))}
                  {filteredCompanies.filter(company => !selectedCompanies.has(company.id)).length === 0 && (
                    <div className="text-center py-3 text-muted-foreground text-sm">
                      {availableCompanies?.length === 0 
                        ? "No companies available"
                        : "No companies match your search"
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Companies */}
              <div className="p-3">
                <h3 className="font-medium mb-2">Selected Companies ({selectedCompanies.size})</h3>
                <div className="space-y-1 max-h-52 overflow-auto">
                  {filteredCompanies
                    .filter(company => selectedCompanies.has(company.id))
                    .map((company) => (
                      <div 
                        key={company.id} 
                        className="p-2 cursor-pointer hover:bg-muted transition-colors text-sm"
                        onClick={() => handleCompanyToggle(company.id)}
                      >
                        {company.company_name}
                      </div>
                    ))}
                  {selectedCompanies.size === 0 && (
                    <div className="text-center py-3 text-muted-foreground text-sm">
                      Click companies on the left to select them
                    </div>
                  )}
                </div>
              </div>
            </div>
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