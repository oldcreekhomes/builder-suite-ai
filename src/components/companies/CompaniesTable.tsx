
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Globe, MapPin, Users, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditCompanyDialog } from "./EditCompanyDialog";
import { ViewCompanyDialog } from "./ViewCompanyDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { useCostCodeGrouping } from "@/hooks/useCostCodeGrouping";
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  website?: string;
  created_at: string;
  representatives_count?: number;
  cost_codes_count?: number;
  cost_codes?: CostCode[];
  groupedCostCodes?: Record<string, CostCode[]>;
  parentCodes?: Set<string>;
}

export function CompaniesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch companies with counts and cost codes
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      console.log('Fetching companies...');
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');
      
      console.log('Companies fetch result:', { companiesData, error: companiesError });
      if (companiesError) throw companiesError;

      // Get counts and cost codes for each company
      const companiesWithData = await Promise.all(
        companiesData.map(async (company) => {
          const [repsResult, costCodesResult] = await Promise.all([
            supabase
              .from('company_representatives')
              .select('id', { count: 'exact' })
              .eq('company_id', company.id),
            supabase
              .from('company_cost_codes')
              .select(`
                cost_code_id,
                cost_codes(*)
              `)
              .eq('company_id', company.id)
          ]);

          const costCodes = costCodesResult.data?.map(item => item.cost_codes).filter(Boolean) || [];

          return {
            ...company,
            representatives_count: repsResult.count || 0,
            cost_codes_count: costCodes.length,
            cost_codes: costCodes as CostCode[]
          };
        })
      );

      return companiesWithData as Company[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Pre-process cost code grouping for each company
  const companiesWithGroupedCodes = companies.map(company => {
    const companyCostCodes = company.cost_codes || [];
    const allCostCodes = companies.flatMap(c => c.cost_codes || []);
    const parentCodes = new Set<string>();
    allCostCodes.forEach(cc => {
      if (cc.parent_group) {
        parentCodes.add(cc.parent_group);
      }
    });

    const groups: Record<string, CostCode[]> = {};
    companyCostCodes.forEach(costCode => {
      let groupKey = 'ungrouped';
      
      if (costCode.parent_group && costCode.parent_group.trim() !== '') {
        groupKey = costCode.parent_group;
      } else {
        const matchingParent = Array.from(parentCodes).find(parentCode => {
          return costCode.code.startsWith(parentCode) && costCode.code !== parentCode;
        });
        
        if (matchingParent) {
          groupKey = matchingParent;
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(costCode);
    });
    
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => a.code.localeCompare(b.code));
    });

    return {
      ...company,
      groupedCostCodes: groups,
      parentCodes
    };
  });

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const getCompanyTypeColor = (type: string) => {
    switch (type) {
      case 'Subcontractor':
        return 'bg-blue-100 text-blue-800';
      case 'Vendor':
        return 'bg-green-100 text-green-800';
      case 'Municipality':
        return 'bg-purple-100 text-purple-800';
      case 'Consultant':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm">Loading companies...</div>;
  }

  const renderCostCodeGroups = (company: Company) => {
    const companyCostCodes = company.cost_codes || [];
    if (!companyCostCodes.length) return <span className="text-xs text-gray-400">No cost codes</span>;

    const companyGroupedCodes = company.groupedCostCodes || {};
    const companyParentCodes = company.parentCodes || new Set();
    
    return (
      <div className="space-y-1">
        {Object.entries(companyGroupedCodes)
          .filter(([groupKey, codes]) => {
            if (groupKey === 'ungrouped') return true;
            const childCodes = codes.filter(code => !companyParentCodes.has(code.code));
            return childCodes.length > 0;
          })
          .sort(([a], [b]) => {
            if (a === 'ungrouped') return -1;
            if (b === 'ungrouped') return 1;
            return a.localeCompare(b);
          })
          .map(([groupKey, codes]) => (
            <div key={groupKey}>
              {groupKey !== 'ungrouped' && (
                <div className="flex items-center space-x-1 mb-1">
                  <button
                    onClick={() => toggleGroupCollapse(groupKey)}
                    className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded text-xs"
                  >
                    {collapsedGroups.has(groupKey) ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <span className="font-medium text-blue-600">{groupKey}</span>
                    <span className="text-gray-500">
                      ({codes.filter(code => !companyParentCodes.has(code.code)).length})
                    </span>
                  </button>
                </div>
              )}
              
              {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && (
                <div className={`space-y-0.5 ${groupKey !== 'ungrouped' ? 'ml-4' : ''}`}>
                  {codes
                    .filter(code => !companyParentCodes.has(code.code))
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(code => (
                      <div key={code.id} className="text-xs">
                        <span className="font-mono">{code.code}</span>
                        <span className="text-gray-600 ml-1">{code.name}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))
        }
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Codes</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Address</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Representatives</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companiesWithGroupedCodes.map((company) => (
              <TableRow key={company.id} className="h-auto">
                <TableCell className="px-2 py-2 align-top w-1/3">
                  {renderCostCodeGroups(company)}
                </TableCell>
                <TableCell className="px-2 py-2 align-top">
                  <div className="text-xs font-medium">{company.company_name}</div>
                </TableCell>
                <TableCell className="px-2 py-2 align-top">
                  <Badge className={`${getCompanyTypeColor(company.company_type)} text-[10px] px-1 py-0`}>
                    {company.company_type}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-2 align-top">
                  <div className="flex items-center space-x-1">
                    {company.address && (
                      <>
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600 truncate max-w-[150px]">
                          {company.address}
                        </span>
                      </>
                    )}
                    {!company.address && <span className="text-gray-400 text-xs">-</span>}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 align-top">
                  {company.website ? (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="text-xs">Website</span>
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-2 align-top">
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-gray-400" />
                    <span className="text-xs">{company.representatives_count || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 align-top text-right">
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingCompany(company)}
                      className="h-6 px-2 text-xs hover:bg-gray-100"
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCompany(company)}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <DeleteButton
                      onDelete={() => deleteCompanyMutation.mutate(company.id)}
                      title="Delete Company"
                      description={`Are you sure you want to delete ${company.company_name}? This action cannot be undone and will also delete all associated representatives and cost codes.`}
                      isLoading={deleteCompanyMutation.isPending}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-xs text-gray-500">
                  No companies found. Start by adding your first company.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditCompanyDialog
        company={editingCompany}
        open={!!editingCompany}
        onOpenChange={(open) => !open && setEditingCompany(null)}
      />

      <ViewCompanyDialog
        company={viewingCompany}
        open={!!viewingCompany}
        onOpenChange={(open) => !open && setViewingCompany(null)}
      />
    </>
  );
}
