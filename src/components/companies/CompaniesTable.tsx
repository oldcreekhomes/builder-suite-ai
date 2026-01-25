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
import { Edit, Archive, Users, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditCompanyDialog } from "./EditCompanyDialog";
import { ViewCompanyDialog } from "./ViewCompanyDialog";
import { CompanyRepresentativesModal } from "./CompanyRepresentativesModal";
import { CompanyCostCodesModal } from "./CompanyCostCodesModal";
import { ArchiveCompanyDialog } from "./ArchiveCompanyDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";


type CostCode = {
  id: string;
  code: string;
  name: string;
};

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  home_builder_id: string;
  created_at: string;
  representatives_count?: number;
  cost_codes_count?: number;
  cost_codes?: CostCode[];
  insurance_required?: boolean;
  archived_at?: string | null;
}

interface CompaniesTableProps {
  searchQuery?: string;
}

export function CompaniesTable({ searchQuery = "" }: CompaniesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [showingReps, setShowingReps] = useState<Company | null>(null);
  const [showingCostCodes, setShowingCostCodes] = useState<Company | null>(null);
  const [archivingCompany, setArchivingCompany] = useState<Company | null>(null);

  // Fetch companies with counts and cost codes - optimized batch fetching
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      console.log('Fetching companies...');
      
      // 1. Fetch ALL companies (we filter archived in JavaScript like Representatives does)
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');
      
      console.log('Companies fetch result:', { companiesData, error: companiesError });
      if (companiesError) throw companiesError;
      if (!companiesData || companiesData.length === 0) return [];

      const companyIds = companiesData.map(c => c.id);

      // 2. Fetch ALL representative counts in ONE query
      const { data: repsData } = await supabase
        .from('company_representatives')
        .select('company_id')
        .in('company_id', companyIds);

      // 3. Fetch ALL cost codes in ONE query
      const { data: costCodeData } = await supabase
        .from('company_cost_codes')
        .select(`
          company_id,
          cost_codes(id, code, name)
        `)
        .in('company_id', companyIds);

      // 4. Aggregate counts in JavaScript (instant, no DB calls)
      const repCountMap: Record<string, number> = {};
      repsData?.forEach(rep => {
        repCountMap[rep.company_id] = (repCountMap[rep.company_id] || 0) + 1;
      });

      const costCodeMap: Record<string, CostCode[]> = {};
      costCodeData?.forEach(item => {
        if (!costCodeMap[item.company_id]) {
          costCodeMap[item.company_id] = [];
        }
        if (item.cost_codes) {
          costCodeMap[item.company_id].push(item.cost_codes as CostCode);
        }
      });

      // 5. Combine all data
      const companiesWithData = companiesData.map(company => ({
        ...company,
        representatives_count: repCountMap[company.id] || 0,
        cost_codes_count: costCodeMap[company.id]?.length || 0,
        cost_codes: costCodeMap[company.id] || []
      }));

      // 6. Filter out archived companies in JavaScript (like Representatives does)
      const activeCompanies = companiesWithData.filter(company => 
        company.archived_at === null
      );

      return activeCompanies as Company[];
    },
  });

  // Archive company mutation
  const archiveCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('companies')
        .update({ 
          archived_at: new Date().toISOString(),
          archived_by: user.id
        })
        .eq('id', companyId);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      // Optimistically remove the archived company from cache immediately
      queryClient.setQueryData(['companies'], (old: Company[] | undefined) => 
        old?.filter(c => c.id !== archivingCompany?.id) ?? []
      );
      
      // Force immediate refetch instead of just invalidating
      await queryClient.refetchQueries({ queryKey: ['companies'] });
      await queryClient.refetchQueries({ queryKey: ['representatives'] });
      setArchivingCompany(null);
      toast({
        title: "Success",
        description: "Company archived successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive company",
        variant: "destructive",
      });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Subcontractor':
        return 'bg-blue-100 text-blue-800';
      case 'Vendor':
        return 'bg-green-100 text-green-800';
      case 'Lender':
        return 'bg-yellow-100 text-yellow-800';
      case 'Consultant':
        return 'bg-orange-100 text-orange-800';
      case 'Municipality':
        return 'bg-purple-100 text-purple-800';
      case 'Utility':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4 text-xs">Loading companies...</div>;
  }

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (company.company_name && company.company_name.toLowerCase().includes(query)) ||
      (company.company_type && company.company_type.toLowerCase().includes(query)) ||
      (company.address && company.address.toLowerCase().includes(query))
    );
  }).sort((a, b) => a.company_name.localeCompare(b.company_name));

  return (
    <>      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-fit whitespace-nowrap">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-80">Address</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Codes</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Representatives</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} className="h-10">
                <TableCell className="px-2 py-1 whitespace-nowrap">
                  <div className="text-xs font-medium">
                    {company.company_name}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Badge className={`text-xs ${getTypeColor(company.company_type)}`}>
                    {company.company_type}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.address ? (
                    <span className="text-xs text-gray-600 truncate max-w-[150px]">
                      {company.address.replace(/, United States$/, '')}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.cost_codes && company.cost_codes.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowingCostCodes(company)}
                          className="flex items-center space-x-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                        >
                          <Hash className="h-3 w-3 text-gray-400" />
                          <span className="text-xs">{company.cost_codes.length}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View cost codes</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.website ? (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-600"
                    >
                      Website
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowingReps(company)}
                        className="flex items-center space-x-1 hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                      >
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-xs">{company.representatives_count || 0}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View representatives</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCompany(company)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit company</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchivingCompany(company)}
                          disabled={archiveCompanyMutation.isPending}
                          className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Archive company</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filteredCompanies.length === 0 && searchQuery && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-xs text-gray-500">
                  No companies found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            )}

            {companies.length === 0 && !searchQuery && (
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

      <CompanyRepresentativesModal
        company={showingReps}
        open={!!showingReps}
        onOpenChange={(open) => !open && setShowingReps(null)}
      />

      <CompanyCostCodesModal
        company={showingCostCodes}
        open={!!showingCostCodes}
        onOpenChange={(open) => !open && setShowingCostCodes(null)}
      />

      <ArchiveCompanyDialog
        open={!!archivingCompany}
        onOpenChange={(open) => !open && setArchivingCompany(null)}
        companyName={archivingCompany?.company_name || ""}
        representativesCount={archivingCompany?.representatives_count || 0}
        costCodesCount={archivingCompany?.cost_codes_count || 0}
        onConfirm={() => archivingCompany && archiveCompanyMutation.mutate(archivingCompany.id)}
        isPending={archiveCompanyMutation.isPending}
      />
    </>
  );
}
