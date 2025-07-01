
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditMarketplaceRepresentativeDialog } from "./EditMarketplaceRepresentativeDialog";

interface MarketplaceRepresentativeWithCompany {
  id: string;
  marketplace_company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  is_primary?: boolean;
  marketplace_companies: {
    company_name: string;
    company_type: string;
  };
}

export function MarketplaceRepresentativesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRepresentative, setEditingRepresentative] = useState<MarketplaceRepresentativeWithCompany | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['marketplace-representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_company_representatives')
        .select(`
          *,
          marketplace_companies (
            company_name,
            company_type
          )
        `)
        .order('first_name');
      
      if (error) throw error;
      return data as MarketplaceRepresentativeWithCompany[];
    },
  });

  const deleteRepresentativeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketplace_company_representatives')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-representatives'] });
      toast({
        title: "Success",
        description: "Representative deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting representative:', error);
      toast({
        title: "Error",
        description: "Failed to delete representative",
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

  const handleEditClick = (representative: MarketplaceRepresentativeWithCompany) => {
    setEditingRepresentative(representative);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingRepresentative(null);
  };

  if (isLoading) {
    return <div className="p-4 text-sm">Loading marketplace representatives...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Email</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Phone</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {representatives.map((rep) => (
              <TableRow key={rep.id} className="h-10">
                <TableCell className="px-2 py-1">
                  <div className="flex flex-col">
                    <div className="text-xs font-medium">
                      {rep.first_name} {rep.last_name}
                    </div>
                    {rep.is_primary && (
                      <Badge variant="secondary" className="text-[10px] mt-0.5 w-fit px-1 py-0">
                        Primary Contact
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="text-xs font-medium">
                    {rep.marketplace_companies.company_name}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Badge className={`${getCompanyTypeColor(rep.marketplace_companies.company_type)} text-[10px] w-fit px-1 py-0`}>
                    {rep.marketplace_companies.company_type}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-1">
                  {rep.email ? (
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{rep.email}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {rep.phone_number ? (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-xs">{rep.phone_number}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
                      onClick={() => handleEditClick(rep)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <DeleteButton
                      onDelete={() => deleteRepresentativeMutation.mutate(rep.id)}
                      title="Delete Representative"
                      description="Are you sure you want to delete this representative? This action cannot be undone."
                      isLoading={deleteRepresentativeMutation.isPending}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {representatives.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-gray-500">
                  No marketplace representatives found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditMarketplaceRepresentativeDialog
        open={editDialogOpen}
        onOpenChange={handleEditDialogClose}
        representative={editingRepresentative}
      />
    </>
  );
}
