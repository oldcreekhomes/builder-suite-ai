
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";
import { ChevronDown, ChevronRight, Users, Edit } from "lucide-react";
import { toTitleCase } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EditRepresentativeDialog } from "./EditRepresentativeDialog";

interface RepresentativeSelectorProps {
  companyId: string | null;
}

interface RepresentativeContentProps {
  companyId: string | null;
}

interface Representative {
  id: string;
  first_name: string;
  last_name: string | null;
  company_id: string;
  title: string;
  email: string;
  phone_number: string | null;
  receive_bid_notifications?: boolean;
  receive_schedule_notifications?: boolean;
  receive_po_notifications?: boolean;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'owner': return 'bg-purple-100 text-purple-800';
    case 'project_manager': return 'bg-blue-100 text-blue-800';
    case 'superintendent': return 'bg-green-100 text-green-800';
    case 'foreman': return 'bg-yellow-100 text-yellow-800';
    case 'estimator': return 'bg-orange-100 text-orange-800';
    case 'accounting': return 'bg-pink-100 text-pink-800';
    case 'sales': return 'bg-cyan-100 text-cyan-800';
    case 'operations': return 'bg-indigo-100 text-indigo-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const representativeTypes = [
  { value: 'owner', label: 'Owner' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
];

// Standalone content component for use in tabs
export function RepresentativeContent({ companyId }: RepresentativeContentProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingRep, setEditingRep] = useState<Representative | null>(null);

  // Fetch representatives for this specific company
  const { data: representatives = [] } = useQuery({
    queryKey: ['company-representatives', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, company_id, title, email, phone_number, receive_bid_notifications, receive_schedule_notifications, receive_po_notifications')
        .eq('company_id', companyId)
        .order('first_name');
      
      if (error) throw error;
      return data as Representative[];
    },
    enabled: !!companyId,
  });

  const deleteRepMutation = useMutation({
    mutationFn: async (repId: string) => {
      const { error } = await supabase
        .from('company_representatives')
        .delete()
        .eq('id', repId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-representatives', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
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

  if (representatives.length > 0) {
    return (
      <>
        <div className="border rounded-md overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>First Name</span>
            <span>Last Name</span>
            <span>Type</span>
            <span>Email</span>
            <span>Phone</span>
            <span className="text-center w-16">Actions</span>
          </div>
          {/* Data rows with max height and scroll */}
          <div className="max-h-64 overflow-y-auto">
            {representatives.map(representative => (
              <div 
                key={representative.id} 
                className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_auto] gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 items-center"
              >
                <span className="truncate text-xs">
                  {representative.first_name}
                </span>
                <span className="truncate text-xs">
                  {representative.last_name}
                </span>
                <span className="truncate text-xs">
                  {representative.title ? (
                    <Badge className={`${getTypeColor(representative.title)} text-[10px] px-1 py-0 border-0`}>
                      {representativeTypes.find(t => t.value === representative.title)?.label || toTitleCase(representative.title)}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">Enter type</span>
                  )}
                </span>
                <span className="truncate text-xs">
                  {representative.email || '—'}
                </span>
                <span className="truncate text-xs">
                  {representative.phone_number || '—'}
                </span>
                <div className="flex justify-center items-center space-x-1 w-16">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRep(representative);
                    }}
                    className="h-6 w-6 p-0 flex items-center justify-center"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <DeleteButton
                    onDelete={() => deleteRepMutation.mutate(representative.id)}
                    title="Delete Representative"
                    description={`Are you sure you want to delete ${representative.first_name} ${representative.last_name || ''}?`}
                    isLoading={deleteRepMutation.isPending}
                    size="icon"
                    className="h-6 w-6 p-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <EditRepresentativeDialog
          representative={editingRep}
          open={!!editingRep}
          onOpenChange={(open) => !open && setEditingRep(null)}
        />
      </>
    );
  }

  return (
    <div className="p-6 text-muted-foreground text-center text-sm border rounded-md bg-muted/30">
      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
      No representatives found for this company
    </div>
  );
}

// Original collapsible component for backwards compatibility
export function RepresentativeSelector({ companyId }: RepresentativeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch representatives for this specific company
  const { data: representatives = [] } = useQuery({
    queryKey: ['company-representatives', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, company_id, title, email, phone_number')
        .eq('company_id', companyId)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Users className="h-4 w-4 text-muted-foreground" />
          <FormLabel className="cursor-pointer m-0">
            Company Representatives
          </FormLabel>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {representatives.length}
          </span>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2">
          {representatives.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-2 px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Name</span>
                <span>Title</span>
                <span>Email</span>
                <span>Phone</span>
              </div>
              {/* Data rows with max height and scroll */}
              <div className="max-h-32 overflow-y-auto">
                {representatives.map(representative => (
                  <div 
                    key={representative.id} 
                    className="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <span className="truncate font-medium text-xs">
                      {representative.first_name} {representative.last_name}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {toTitleCase(representative.title)}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {representative.email || '—'}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {representative.phone_number || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 text-muted-foreground text-center text-xs border rounded-md bg-muted/30">
              No representatives found for this company
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
