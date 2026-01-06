import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type InvoiceDateField = 'invoices_approved' | 'invoices_paid';

export const useUpdateProjectQBInvoiceDates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      field,
      date 
    }: { 
      projectId: string; 
      field: InvoiceDateField;
      date: string | null;
    }) => {
      const columnName = field === 'invoices_approved' 
        ? 'qb_invoices_approved_date' 
        : 'qb_invoices_paid_date';
      
      const { error } = await supabase
        .from("projects")
        .update({ [columnName]: date })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const fieldLabel = variables.field === 'invoices_approved' 
        ? 'Invoices Approved' 
        : 'Invoices Paid';
      toast({
        title: "Date updated",
        description: `${fieldLabel} date has been saved.`,
      });
    },
    onError: (error) => {
      console.error("Error updating QB invoice date:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice date.",
        variant: "destructive",
      });
    },
  });
};
