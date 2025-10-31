import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RestoreBillParams {
  ownerId: string;
  vendorId: string;
  projectId: string;
  billDate: string;
  dueDate: string;
  referenceNumber: string;
  totalAmount: number;
  costCodeId: string;
  memo: string;
}

export function useRestoreBill() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RestoreBillParams) => {
      const { data, error } = await supabase.functions.invoke('recreate-bill', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: "Bill Restored",
        description: "The bill has been successfully recreated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
