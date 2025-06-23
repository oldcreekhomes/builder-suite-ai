

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
import { Pencil, Mail, Phone } from "lucide-react";
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
  companies: {
    company_name: string;
  };
}

export function RepresentativesTable() {
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
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
                    {rep.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{rep.email}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {rep.phone_number && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{rep.phone_number}</span>
                      </div>
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

