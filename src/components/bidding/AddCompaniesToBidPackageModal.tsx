import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe } from 'lucide-react';
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
  const [showAll, setShowAll] = useState(false);
  const { addCompanyToBidPackage } = useBiddingCompanyMutations(projectId);

  // Fetch the project's region
  const { data: projectRegion } = useQuery({
    queryKey: ['project-region', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('region')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data?.region as string | null;
    },
    enabled: open && !!projectId,
  });

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
            phone_number,
            service_areas
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

  // Filter companies by region unless showAll is checked
  const filteredCompanies = React.useMemo(() => {
    if (!availableCompanies) return [];
    if (showAll || !projectRegion) return availableCompanies;
    return availableCompanies.filter(company => {
      const areas = (company as any).service_areas as string[] | null;
      return areas && areas.includes(projectRegion);
    });
  }, [availableCompanies, showAll, projectRegion]);

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
          {projectRegion && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Showing companies for: <span className="font-medium text-foreground">{projectRegion}</span>
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-all-companies"
                  checked={showAll}
                  onCheckedChange={(checked) => setShowAll(!!checked)}
                />
                <Label htmlFor="show-all-companies" className="text-sm cursor-pointer">
                  Show all companies
                </Label>
              </div>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading available companies...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 h-64">
              {/* Available Companies */}
              <div className="p-2">
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
                      No companies available
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Companies */}
              <div className="p-2">
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