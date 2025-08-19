
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditRepresentativeDialog } from "./EditRepresentativeDialog";
import { DeleteButton } from "@/components/ui/delete-button";

interface Representative {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  company_id: string;
  receive_bid_notifications?: boolean;
  receive_schedule_notifications?: boolean;
  receive_po_notifications?: boolean;
  companies?: {
    company_name: string;
  } | null;
}

interface RepresentativesTableProps {
  searchQuery?: string;
}

export function RepresentativesTable({ searchQuery = "" }: RepresentativesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRepresentative, setEditingRepresentative] = useState<Representative | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch representatives
  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_representatives')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          title,
          company_id,
          receive_bid_notifications,
          receive_schedule_notifications,
          receive_po_notifications,
          created_at,
          updated_at,
          companies!company_representatives_company_id_fkey (
            company_name
          )
        `)
        .order('first_name');
      
      if (error) throw error;
      
      // Handle the data safely, in case the join fails
      return (data || []).map(item => ({
        ...item,
        companies: (item.companies && typeof item.companies === 'object' && 'company_name' in item.companies) 
          ? { company_name: item.companies.company_name } 
          : null
      })) as Representative[];
    },
  });

  // Delete representative mutation
  const deleteRepMutation = useMutation({
    mutationFn: async (repId: string) => {
      const { error } = await supabase
        .from('company_representatives')
        .delete()
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
      toast({
        title: "Success",
        description: "Representative deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete representative",
        variant: "destructive",
      });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'estimator':
        return 'bg-blue-100 text-blue-800';
      case 'project manager':
        return 'bg-green-100 text-green-800';
      case 'foreman':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditClick = (rep: Representative) => {
    setEditingRepresentative(rep);
    setEditDialogOpen(true);
  };

  // Filter representatives based on search query
  const filteredRepresentatives = representatives.filter(rep => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${rep.first_name} ${rep.last_name}`.toLowerCase();
    return (
      fullName.includes(query) ||
      (rep.companies?.company_name && rep.companies.company_name.toLowerCase().includes(query)) ||
      (rep.title && rep.title.toLowerCase().includes(query)) ||
      (rep.email && rep.email.toLowerCase().includes(query)) ||
      (rep.phone_number && rep.phone_number.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return <div className="text-center py-2 text-sm">Loading representatives...</div>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Email</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Phone</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRepresentatives.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-gray-500">
                  No representatives found matching "{searchQuery}".
                </TableCell>
              </TableRow>
            ) : representatives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-gray-500">
                  No representatives found. Add your first representative to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredRepresentatives.map((rep) => (
                <TableRow key={rep.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    {rep.first_name} {rep.last_name}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">{rep.companies?.company_name}</TableCell>
                  <TableCell className="px-2 py-1">
                    {rep.title && (
                      <Badge className={`${getTypeColor(rep.title.toLowerCase())} text-[10px] px-1 py-0`}>
                        {rep.title}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {rep.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-2.5 w-2.5 text-gray-400" />
                        <span className="text-xs">{rep.email}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {rep.phone_number && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-2.5 w-2.5 text-gray-400" />
                        <span className="text-xs">{rep.phone_number}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <div className="flex justify-end space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(rep)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <DeleteButton
                        onDelete={() => deleteRepMutation.mutate(rep.id)}
                        title="Delete Representative"
                        description={`Are you sure you want to delete ${rep.first_name} ${rep.last_name}? This action cannot be undone.`}
                        isLoading={deleteRepMutation.isPending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditRepresentativeDialog
        representative={editingRepresentative}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
