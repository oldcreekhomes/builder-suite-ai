
import { useState, useMemo, useEffect } from "react";
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
}

export function CompaniesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedCostCodes, setCollapsedCostCodes] = useState<Set<string>>(new Set());

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

  // Get all unique cost codes from all companies
  const allCostCodes = useMemo(() => {
    const costCodes = companies.flatMap(company => company.cost_codes || []);
    return Array.from(new Map(costCodes.map(cc => [cc.id, cc])).values());
  }, [companies]);

  // Use the cost code grouping hook at the top level
  const { groupedCostCodes, parentCodes } = useCostCodeGrouping(allCostCodes);

  // Update collapsed groups when grouped cost codes change
  useEffect(() => {
    const newCollapsedGroups = new Set<string>();
    const newCollapsedCostCodes = new Set<string>();
    
    Object.keys(groupedCostCodes).forEach(groupKey => {
      if (groupKey !== 'ungrouped') {
        newCollapsedGroups.add(groupKey);
      }
    });
    
    // Also collapse all individual cost codes by default
    Object.values(groupedCostCodes).flat().forEach(costCode => {
      if (!parentCodes.has(costCode.code)) {
        newCollapsedCostCodes.add(costCode.id);
      }
    });
    
    setCollapsedGroups(newCollapsedGroups);
    setCollapsedCostCodes(newCollapsedCostCodes);
  }, [groupedCostCodes, parentCodes]);

  // Group companies by cost codes - restructure to match settings hierarchy
  const costCodeToCompaniesMap = useMemo(() => {
    // Create a map from cost code ID to companies that have that cost code
    const costCodeCompanyMap = new Map<string, Company[]>();
    
    companies.forEach(company => {
      company.cost_codes?.forEach(costCode => {
        if (!costCodeCompanyMap.has(costCode.id)) {
          costCodeCompanyMap.set(costCode.id, []);
        }
        costCodeCompanyMap.get(costCode.id)!.push(company);
      });
    });

    // Create table rows in hierarchical structure like settings
    const tableRows: Array<{
      id: string;
      type: 'parent' | 'child' | 'company';
      costCode?: CostCode;
      company?: Company;
      groupKey: string;
      level: number;
      parentCode?: string;
    }> = [];

    // Process grouped cost codes to create hierarchical structure
    Object.entries(groupedCostCodes)
      .filter(([groupKey, codes]) => {
        if (groupKey === 'ungrouped') return codes.length > 0;
        const childCodes = codes.filter(code => !parentCodes.has(code.code));
        return childCodes.length > 0;
      })
      .sort(([a], [b]) => {
        if (a === 'ungrouped') return 1;
        if (b === 'ungrouped') return -1;
        return a.localeCompare(b);
      })
      .forEach(([groupKey, codes]) => {
        // Add parent group row
        if (groupKey !== 'ungrouped') {
          tableRows.push({
            id: `parent-${groupKey}`,
            type: 'parent',
            groupKey,
            level: 0
          });
        }

        // Add child cost codes and their companies
        const childCodes = codes.filter(code => !parentCodes.has(code.code));
        childCodes.sort((a, b) => a.code.localeCompare(b.code)).forEach(costCode => {
          // Add cost code row
          tableRows.push({
            id: `child-${costCode.id}`,
            type: 'child',
            costCode,
            groupKey,
            level: groupKey !== 'ungrouped' ? 1 : 0,
            parentCode: groupKey !== 'ungrouped' ? groupKey : undefined
          });

          // Add company rows under this cost code
          const companiesForCostCode = costCodeCompanyMap.get(costCode.id) || [];
          companiesForCostCode.forEach(company => {
            tableRows.push({
              id: `company-${costCode.id}-${company.id}`,
              type: 'company',
              costCode,
              company,
              groupKey,
              level: groupKey !== 'ungrouped' ? 2 : 1,
              parentCode: groupKey !== 'ungrouped' ? groupKey : undefined
            });
          });
        });
      });

    return { tableRows };
  }, [companies, groupedCostCodes, parentCodes]);

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

  const toggleCostCodeCollapse = (costCodeId: string) => {
    setCollapsedCostCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(costCodeId)) {
        newSet.delete(costCodeId);
      } else {
        newSet.add(costCodeId);
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

  const { tableRows } = costCodeToCompaniesMap;

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Address</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Representatives</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows
              .filter((row) => {
                // Always show parent rows
                if (row.type === 'parent') return true;
                
                // For child cost code rows: show only if parent is expanded
                if (row.type === 'child') {
                  if (row.parentCode && collapsedGroups.has(row.parentCode)) {
                    return false;
                  }
                  return true;
                }
                
                // For company rows: show only if both parent is expanded AND cost code is expanded
                if (row.type === 'company') {
                  if (row.parentCode && collapsedGroups.has(row.parentCode)) {
                    return false;
                  }
                  if (row.costCode && collapsedCostCodes.has(row.costCode.id)) {
                    return false;
                  }
                  return true;
                }
                
                return true;
              })
              .map((row) => (
              <TableRow key={row.id} className="h-auto">
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'parent' && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleGroupCollapse(row.groupKey)}
                        className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded text-xs"
                      >
                        {collapsedGroups.has(row.groupKey) ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <span className="font-medium text-blue-600">{row.groupKey}</span>
                      </button>
                    </div>
                  )}
                  
                  {row.type === 'child' && row.costCode && (
                    <div className="ml-4 flex items-center space-x-1">
                      <button
                        onClick={() => toggleCostCodeCollapse(row.costCode.id)}
                        className="flex items-center space-x-1 hover:bg-gray-50 p-1 rounded text-xs"
                      >
                        {collapsedCostCodes.has(row.costCode.id) ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <span className="font-mono text-xs font-medium">{row.costCode.code}</span>
                        <span className="text-gray-600 ml-1 text-xs">{row.costCode.name}</span>
                      </button>
                    </div>
                  )}
                  
                  {row.type === 'company' && (
                    <div className="ml-8">
                      <span className="text-xs text-gray-500">└─</span>
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'company' && row.company && (
                    <div className="text-xs font-medium">{row.company.company_name}</div>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'company' && row.company && (
                    <Badge className={`${getCompanyTypeColor(row.company.company_type)} text-[10px] px-1 py-0`}>
                      {row.company.company_type}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'company' && row.company && (
                    <div className="flex items-center space-x-1">
                      {row.company.address && (
                        <>
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600 truncate max-w-[150px]">
                            {row.company.address}
                          </span>
                        </>
                      )}
                      {!row.company.address && <span className="text-gray-400 text-xs">-</span>}
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'company' && row.company && (
                    <>
                      {row.company.website ? (
                        <a 
                          href={row.company.website.startsWith('http') ? row.company.website : `https://${row.company.website}`}
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
                    </>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top">
                  {row.type === 'company' && row.company && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{row.company.representatives_count || 0}</span>
                    </div>
                  )}
                </TableCell>
                
                <TableCell className="px-2 py-2 align-top text-right">
                  {row.type === 'company' && row.company && (
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingCompany(row.company)}
                        className="h-6 px-2 text-xs hover:bg-gray-100"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCompany(row.company)}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <DeleteButton
                        onDelete={() => deleteCompanyMutation.mutate(row.company.id)}
                        title="Delete Company"
                        description={`Are you sure you want to delete ${row.company.company_name}? This action cannot be undone and will also delete all associated representatives and cost codes.`}
                        isLoading={deleteCompanyMutation.isPending}
                      />
                    </div>
                  )}
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
