
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Update notification preferences mutation
  const updateNotificationMutation = useMutation({
    mutationFn: async ({ repId, field, value }: { repId: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from('company_representatives')
        .update({ [field]: value })
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preference",
        variant: "destructive",
      });
    },
  });

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ repId, title }: { repId: string; title: string }) => {
      const { error } = await supabase
        .from('company_representatives')
        .update({ title })
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update representative title",
        variant: "destructive",
      });
    },
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ repId, email }: { repId: string; email: string }) => {
      const { error } = await supabase
        .from('company_representatives')
        .update({ email: email || null })
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    },
  });

  // Update phone mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async ({ repId, phone }: { repId: string; phone: string }) => {
      const { error } = await supabase
        .from('company_representatives')
        .update({ phone_number: phone || null })
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive",
      });
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

  const handleNotificationToggle = (repId: string, field: string, currentValue: boolean) => {
    updateNotificationMutation.mutate({ repId, field, value: !currentValue });
  };

  const handleTitleChange = (repId: string, title: string) => {
    updateTitleMutation.mutate({ repId, title });
  };

  const handleEmailChange = (repId: string, email: string) => {
    updateEmailMutation.mutate({ repId, email });
  };

  const handlePhoneChange = (repId: string, phone: string) => {
    updatePhoneMutation.mutate({ repId, phone });
  };

  const representativeTypes = [
    { value: 'estimator', label: 'Estimator' },
    { value: 'project manager', label: 'Project Manager' },
    { value: 'foreman', label: 'Foreman' },
    { value: 'superintendent', label: 'Superintendent' },
    { value: 'sales representative', label: 'Sales Rep' },
    { value: 'owner', label: 'Owner' },
    { value: 'office manager', label: 'Office Manager' },
    { value: 'accountant', label: 'Accountant' },
  ];

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
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center">Bid Notifications</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center">Schedule Notifications</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center">PO Notifications</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Phone</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRepresentatives.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 text-xs text-gray-500">
                  No representatives found matching "{searchQuery}".
                </TableCell>
              </TableRow>
            ) : representatives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 text-xs text-gray-500">
                  No representatives found. Add your first representative to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredRepresentatives.map((rep) => (
                <TableRow key={rep.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs font-medium align-middle">
                    {rep.first_name} {rep.last_name}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs align-middle">{rep.companies?.company_name}</TableCell>
                  <TableCell className="px-2 py-1 align-middle">
                    <Select 
                      value={rep.title || ''} 
                      onValueChange={(value) => handleTitleChange(rep.id, value)}
                    >
                      <SelectTrigger className="h-auto w-full p-1 border-0 bg-transparent text-xs font-normal hover:bg-accent/50 rounded-sm transition-colors focus:ring-0 focus:outline-0">
                        <SelectValue placeholder="Select type" className="text-xs" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg z-50">
                        {representativeTypes.map((type) => (
                          <SelectItem 
                            key={type.value} 
                            value={type.value}
                            className="text-xs hover:bg-accent"
                          >
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-2 py-1 align-middle">
                    <input
                      value={rep.email || ''}
                      onChange={(e) => handleEmailChange(rep.id, e.target.value)}
                      onBlur={(e) => handleEmailChange(rep.id, e.target.value)}
                      placeholder="Enter email"
                      className="w-full bg-transparent text-xs border-none outline-none p-0 m-0"
                      type="email"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-center align-middle">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_bid_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_bid_notifications', rep.receive_bid_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-center align-middle">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_schedule_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_schedule_notifications', rep.receive_schedule_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-center align-middle">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_po_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_po_notifications', rep.receive_po_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 align-middle">
                    <input
                      value={rep.phone_number || ''}
                      onChange={(e) => handlePhoneChange(rep.id, e.target.value)}
                      onBlur={(e) => handlePhoneChange(rep.id, e.target.value)}
                      placeholder="Enter phone"
                      className="w-full bg-transparent text-xs border-none outline-none p-0 m-0"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right align-middle">
                    <div className="flex justify-end items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(rep)}
                        className="h-8 w-8 p-0 flex items-center justify-center"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center">
                        <DeleteButton
                          onDelete={() => deleteRepMutation.mutate(rep.id)}
                          title="Delete Representative"
                          description={`Are you sure you want to delete ${rep.first_name} ${rep.last_name}? This action cannot be undone.`}
                          isLoading={deleteRepMutation.isPending}
                        />
                      </div>
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
