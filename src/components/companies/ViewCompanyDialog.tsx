
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Globe, 
  Users, 
  Plus, 
  Pencil, 
  Trash2,
  Mail,
  Phone 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddRepresentativeDialog } from "./AddRepresentativeDialog";
import { EditRepresentativeDialog } from "./EditRepresentativeDialog";

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  website?: string;
}

interface Representative {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  receive_bid_notifications?: boolean;
  receive_schedule_notifications?: boolean;
  receive_po_notifications?: boolean;
}

interface ViewCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewCompanyDialog({ company, open, onOpenChange }: ViewCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addRepOpen, setAddRepOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);

  // Fetch company representatives
  const { data: representatives = [], isLoading: repsLoading } = useQuery({
    queryKey: ['company-representatives', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, email, phone_number, title, receive_bid_notifications, receive_schedule_notifications, receive_po_notifications')
        .eq('company_id', company.id)
        .order('first_name');
      
      if (error) throw error;
      return data as Representative[];
    },
    enabled: !!company?.id && open,
  });

  // Fetch company cost codes
  const { data: costCodes = [], isLoading: costCodesLoading } = useQuery({
    queryKey: ['company-cost-codes-details', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select(`
          cost_code_id,
          cost_codes (
            id,
            code,
            name
          )
        `)
        .eq('company_id', company.id);
      
      if (error) throw error;
      return data.map(item => item.cost_codes).filter(Boolean);
    },
    enabled: !!company?.id && open,
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
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
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

  if (!company) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{company.company_name}</span>
              <Badge className={getCompanyTypeColor(company.company_type)}>
                {company.company_type}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Company Details */}
            <div className="space-y-3">
              {company.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{company.address}</span>
                </div>
              )}
              
              {company.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>

            <Separator />

            {/* Representatives Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Representatives ({representatives.length})</span>
                </h3>
                <Button onClick={() => setAddRepOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Representative
                </Button>
              </div>

              {repsLoading ? (
                <div className="text-center py-4">Loading representatives...</div>
              ) : representatives.length > 0 ? (
                <div className="grid gap-4">
                  {representatives.map((rep) => (
                    <div key={rep.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                           <div className="flex items-center space-x-2">
                             <span className="font-medium">
                               {rep.first_name} {rep.last_name}
                             </span>
                           </div>
                          
                          {rep.title && (
                            <div className="text-sm text-gray-600">{rep.title}</div>
                          )}
                          
                          <div className="flex flex-col space-y-1">
                            {rep.email && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <a href={`mailto:${rep.email}`} className="text-blue-600 hover:text-blue-800">
                                  {rep.email}
                                </a>
                              </div>
                            )}
                            
                            {rep.phone_number && (
                              <div className="flex items-center space-x-2 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <a href={`tel:${rep.phone_number}`} className="text-blue-600 hover:text-blue-800">
                                  {rep.phone_number}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRep(rep)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRepMutation.mutate(rep.id)}
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No representatives added yet.
                </div>
              )}
            </div>

            <Separator />

            {/* Cost Codes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Associated Cost Codes ({costCodes.length})
              </h3>

              {costCodesLoading ? (
                <div className="text-center py-4">Loading cost codes...</div>
              ) : costCodes.length > 0 ? (
                <div className="grid gap-2">
                  {costCodes.map((costCode: any) => (
                    <div key={costCode.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <Badge variant="outline">{costCode.code}</Badge>
                      <span className="text-sm">{costCode.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No cost codes associated yet.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddRepresentativeDialog
        companyId={company.id}
        open={addRepOpen}
        onOpenChange={setAddRepOpen}
      />

      <EditRepresentativeDialog
        representative={editingRep}
        open={!!editingRep}
        onOpenChange={(open) => !open && setEditingRep(null)}
      />
    </>
  );
}
