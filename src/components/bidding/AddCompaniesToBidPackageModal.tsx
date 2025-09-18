import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import { useBiddingCompanyMutations } from '@/hooks/useBiddingCompanyMutations';
import { useProject } from '@/hooks/useProject';
import { useDistanceFilter } from '@/hooks/useDistanceFilter';

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
  const { addCompanyToBidPackage } = useBiddingCompanyMutations(projectId);
  
  // Fetch project details for address
  const { data: project } = useProject(projectId);

  // Fetch companies associated with this cost code that aren't already in the bid package
  const { data: allAvailableCompanies, isLoading } = useQuery({
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

  // Apply distance filtering
  const {
    maxDistance,
    setMaxDistance,
    filteredCompanies: availableCompanies,
    isCalculating,
    stats
  } = useDistanceFilter({
    projectAddress: project?.address || null,
    companies: allAvailableCompanies || [],
    enabled: open && !!project?.address
  });

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Companies to Bid Package</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading available companies...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Distance Filter */}
              {project?.address && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Distance Filter</span>
                    {isCalculating && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Within {maxDistance === 0 ? 'any distance' : `${maxDistance} miles`} of job site</span>
                      <span className="text-muted-foreground">
                        {stats.filtered} of {stats.total} companies
                      </span>
                    </div>
                    
                    <Slider
                      value={[maxDistance]}
                      onValueChange={(value) => setMaxDistance(value[0])}
                      min={0}
                      max={30}
                      step={5}
                      className="w-full"
                    />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>All</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20</span>
                      <span>30 miles</span>
                    </div>
                    
                    {stats.withoutDistance > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Note: {stats.withoutDistance} companies without addresses are always included
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Company Selection Grid */}
              <div className="grid grid-cols-2 gap-3 h-64">
                {/* Available Companies */}
                <div className="p-2">
                  <h3 className="font-medium mb-2">Available Companies</h3>
                  <div className="space-y-1 max-h-52 overflow-auto">
                    {(availableCompanies || [])
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
                    {(availableCompanies || []).filter(company => !selectedCompanies.has(company.id)).length === 0 && (
                      <div className="text-center py-3 text-muted-foreground text-sm">
                        No companies available
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Companies */}
                <div className="p-2">
                  <h3 className="font-medium mb-2">Selected Companies ({selectedCompanies.size})</h3>
                  <div className="space-y-1 max-h-52 overflow-auto">
                    {(availableCompanies || [])
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
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end w-full">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddCompanies}
                disabled={selectedCompanies.size === 0 || addCompanyToBidPackage.isPending}
              >
                {addCompanyToBidPackage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Companies
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}