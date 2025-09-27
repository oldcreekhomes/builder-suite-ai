import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Hash } from "lucide-react";

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit_of_measure: string | null;
}

interface Company {
  id: string;
  company_name: string;
}

interface CompanyCostCodesModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyCostCodesModal({
  company,
  open,
  onOpenChange,
}: CompanyCostCodesModalProps) {
  const { data: costCodes = [], isLoading } = useQuery({
    queryKey: ['company-cost-codes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select(`
          cost_code_id,
          cost_codes(*)
        `)
        .eq('company_id', company.id);
      
      if (error) throw error;
      return data?.map(item => item.cost_codes).filter(Boolean) as CostCode[] || [];
    },
    enabled: !!company?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            {company?.company_name} Cost Codes
          </DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg">
          <div className="space-y-3 max-h-96 overflow-y-auto p-4">
            {isLoading ? (
              <div className="text-xs text-gray-500 text-center">
                Loading cost codes...
              </div>
            ) : costCodes.length === 0 ? (
              <div className="text-xs text-gray-500 text-center">
                No cost codes found for this company.
              </div>
            ) : (
              costCodes.map((costCode) => (
                <div
                  key={costCode.id}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-2">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-medium text-gray-900">
                      {costCode.code}
                    </span>
                    <span className="text-xs text-gray-600">
                      {costCode.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}