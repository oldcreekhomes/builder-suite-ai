import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TEST_BILL_IDS = [
  'd35c45c8-9b86-4d65-8b9e-d3d9ac00441a',
  'c1e5de6a-566e-4f27-a634-54dd72d77ee2',
  '9a6c06da-debe-4003-9ad3-b55b1e9d7bcb',
  '16fde4d3-4747-4ab0-8614-8014966b1a1f',
  '7aa17c1c-fe3c-4521-a312-01e208c398fc',
  'ff519832-cb7d-47e2-929f-c7855fbd819c',
  'f499e1be-3611-483d-82a2-82340837782b'
];

export function useDeleteTestBills() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const results = [];
      
      for (const billId of TEST_BILL_IDS) {
        const { error } = await supabase.rpc('delete_bill_with_journal_entries', {
          bill_id_param: billId
        });
        
        if (error) {
          results.push({ billId, success: false, error: error.message });
        } else {
          results.push({ billId, success: true });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: "Test Bills Deleted",
        description: `Successfully deleted ${successCount} of ${TEST_BILL_IDS.length} test bills${failCount > 0 ? ` (${failCount} failed)` : ''}`,
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
