
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
import { Mail, Phone, MapPin } from "lucide-react";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditRepresentativeDialog } from "./EditRepresentativeDialog";
import { SettingsTableWrapper } from "@/components/ui/settings-table-wrapper";


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
  service_areas?: string[];
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

  // Fetch representatives - filter out those from archived companies
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
          service_areas,
          created_at,
          updated_at,
          companies!company_representatives_company_id_fkey (
            company_name,
            archived_at
          )
        `)
        .order('first_name');
      
      if (error) throw error;
      
      // Filter out representatives from archived companies and handle data safely
      return (data || [])
        .filter(item => {
          // Only include if the company exists and is not archived
          if (!item.companies || typeof item.companies !== 'object') return false;
          const company = item.companies as { company_name: string; archived_at: string | null };
          return company.archived_at === null;
        })
        .map(item => ({
          ...item,
          companies: (item.companies && typeof item.companies === 'object' && 'company_name' in item.companies) 
            ? { company_name: (item.companies as { company_name: string }).company_name } 
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
    switch (type?.toLowerCase()) {
      case 'estimator':
        return 'bg-blue-100 text-blue-800';
      case 'project manager':
        return 'bg-green-100 text-green-800';
      case 'foreman':
        return 'bg-orange-100 text-orange-800';
      case 'superintendent':
        return 'bg-purple-100 text-purple-800';
      case 'sales representative':
        return 'bg-teal-100 text-teal-800';
      case 'owner':
        return 'bg-indigo-100 text-indigo-800';
      case 'office manager':
        return 'bg-pink-100 text-pink-800';
      case 'accountant':
        return 'bg-yellow-100 text-yellow-800';
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
      <SettingsTableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Service Area</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Bid Notifications</TableHead>
              <TableHead className="text-center">Schedule Notifications</TableHead>
              <TableHead className="text-center">PO Notifications</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRepresentatives.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4 text-muted-foreground">
                  No representatives found matching "{searchQuery}".
                </TableCell>
              </TableRow>
            ) : representatives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-4 text-muted-foreground">
                  No representatives found. Add your first representative to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredRepresentatives.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="font-medium">
                    {rep.first_name}
                  </TableCell>
                  <TableCell className="font-medium">
                    {rep.last_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{rep.companies?.company_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(rep.service_areas || []).map((area) => (
                        <Badge key={area} variant="outline" className="text-xs px-1.5 py-0.5">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={rep.title || ''} 
                      onValueChange={(value) => handleTitleChange(rep.id, value)}
                    >
                      <SelectTrigger className="h-auto w-full p-1 border-0 bg-transparent font-normal hover:bg-accent/50 rounded-sm transition-colors focus:ring-0 focus:outline-0 [&>svg]:hidden">
                        {rep.title ? (
                          <Badge className={`${getTypeColor(rep.title)} px-1.5 py-0.5 border-0`}>
                            {representativeTypes.find(t => t.value === rep.title)?.label || rep.title}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Enter type</span>
                        )}
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg z-50">
                        {representativeTypes.map((type) => (
                          <SelectItem 
                            key={type.value} 
                            value={type.value}
                            className="hover:bg-accent"
                          >
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <input
                      value={rep.email || ''}
                      onChange={(e) => handleEmailChange(rep.id, e.target.value)}
                      onBlur={(e) => handleEmailChange(rep.id, e.target.value)}
                      placeholder="Enter email"
                      className="w-full bg-transparent text-sm border-none outline-none p-0 m-0"
                      type="email"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      value={rep.phone_number || ''}
                      onChange={(e) => handlePhoneChange(rep.id, e.target.value)}
                      onBlur={(e) => handlePhoneChange(rep.id, e.target.value)}
                      placeholder="Enter phone"
                      className="w-full bg-transparent text-sm border-none outline-none p-0 m-0"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_bid_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_bid_notifications', rep.receive_bid_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_schedule_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_schedule_notifications', rep.receive_schedule_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={rep.receive_po_notifications || false}
                        onCheckedChange={() => handleNotificationToggle(rep.id, 'receive_po_notifications', rep.receive_po_notifications || false)}
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <TableRowActions actions={[
                        {
                          label: "Edit",
                          onClick: () => handleEditClick(rep),
                        },
                        {
                          label: "Delete",
                          variant: "destructive",
                          requiresConfirmation: true,
                          confirmTitle: "Delete Representative",
                          confirmDescription: `Are you sure you want to delete ${rep.first_name} ${rep.last_name}? This action cannot be undone.`,
                          onClick: () => deleteRepMutation.mutate(rep.id),
                          isLoading: deleteRepMutation.isPending,
                        },
                      ]} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SettingsTableWrapper>

      <EditRepresentativeDialog
        representative={editingRepresentative}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
