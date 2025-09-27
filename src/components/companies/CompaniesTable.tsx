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
import { Edit, Trash2, Globe, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditCompanyDialog } from "./EditCompanyDialog";
import { ViewCompanyDialog } from "./ViewCompanyDialog";

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
  website?: string;
  created_at: string;
  representatives_count?: number;
  cost_codes_count?: number;
  cost_codes?: CostCode[];
}

interface CompaniesTableProps {
  searchQuery?: string;
}

export function CompaniesTable({ searchQuery = "" }: CompaniesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

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
    return <div className="p-4 text-xs">Loading companies...</div>;
  }

  return (
    <>      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Address</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Representatives</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies
              .filter(company => {
                if (!searchQuery.trim()) return true;
                
                const query = searchQuery.toLowerCase();
                return (
                  (company.company_name && company.company_name.toLowerCase().includes(query)) ||
                  (company.company_type && company.company_type.toLowerCase().includes(query)) ||
                  (company.address && company.address.toLowerCase().includes(query))
                );
              })
              .sort((a, b) => a.company_name.localeCompare(b.company_name))
              .map((company) => (
                <TableRow key={company.id} className="h-10">
                  <TableCell className="px-2 py-1">
                    <div className="text-xs font-medium">
                      {company.company_name}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge className={`${getCompanyTypeColor(company.company_type)} text-[10px] w-fit px-1 py-0`}>
                      {company.company_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {company.address ? (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600 truncate max-w-[150px]">
                          {company.address}
                        </span>
                      </div>
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
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">Website</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{company.representatives_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingCompany(company)}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        title="View company"
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCompany(company)}
                        className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
                        title="Edit company"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCompanyMutation.mutate(company.id)}
                        disabled={deleteCompanyMutation.isPending}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        title="Delete company"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            {companies.filter(company => {
              if (!searchQuery.trim()) return true;
              
              const query = searchQuery.toLowerCase();
              return (
                (company.company_name && company.company_name.toLowerCase().includes(query)) ||
                (company.company_type && company.company_type.toLowerCase().includes(query)) ||
                (company.address && company.address.toLowerCase().includes(query))
              );
            }).length === 0 && searchQuery && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-gray-500">
                  No companies found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            )}

            {companies.length === 0 && !searchQuery && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-gray-500">
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