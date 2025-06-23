
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
import { Pencil, Trash2, Mail, Phone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditRepresentativeDialog } from "@/components/companies/EditRepresentativeDialog";

interface Representative {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  is_primary: boolean;
  company_id: string;
  companies: {
    company_name: string;
  };
}

export function RepresentativesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRepresentative, setEditingRepresentative] = useState<Representative | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [representativeToDelete, setRepresentativeToDelete] = useState<Representative | null>(null);

  // Fetch representatives
  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_representatives')
        .select(`
          *,
          companies (
            company_name
          )
        `)
        .order('first_name');
      
      if (error) throw error;
      return data as Representative[];
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
      setDeleteDialogOpen(false);
      setRepresentativeToDelete(null);
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

  const handleDeleteClick = (rep: Representative) => {
    setRepresentativeToDelete(rep);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (representativeToDelete) {
      deleteRepMutation.mutate(representativeToDelete.id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading representatives...</div>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {representatives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No representatives found. Add your first representative to get started.
                </TableCell>
              </TableRow>
            ) : (
              representatives.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">
                    {rep.first_name} {rep.last_name}
                  </TableCell>
                  <TableCell>{rep.companies?.company_name}</TableCell>
                  <TableCell>
                    {rep.title && (
                      <Badge className={getTypeColor(rep.title.toLowerCase())}>
                        {rep.title}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {rep.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{rep.email}</span>
                        </div>
                      )}
                      {rep.phone_number && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{rep.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rep.is_primary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(rep)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(rep)}
                        className="hover:bg-red-100 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Representative</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {representativeToDelete?.first_name} {representativeToDelete?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
