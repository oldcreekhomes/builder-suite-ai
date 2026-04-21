import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CostCode {
  id: string;
  code: string;
  name: string;
  category?: string;
}

export function useCostCodeSearch() {
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCostCodes = async () => {
      try {
        // Resolve current tenant owner_id (own id for owners, home_builder_id for employees/accountants)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCostCodes([]);
          return;
        }

        const { data: info } = await supabase.rpc('get_current_user_home_builder_info');
        const ownerId = info?.[0]?.is_employee ? info[0].home_builder_id : user.id;

        if (!ownerId) {
          setCostCodes([]);
          return;
        }

        const { data, error } = await supabase
          .from('cost_codes')
          .select('id, code, name, category')
          .eq('owner_id', ownerId)
          .order('code');

        if (error) throw error;
        // Filter out subcategories (cost codes with .XXX format)
        const parentCostCodes = (data || []).filter(cc => !cc.code.includes('.'));
        setCostCodes(parentCostCodes);
      } catch (error) {
        console.error('Error fetching cost codes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCostCodes();
  }, []);

  const searchCostCodes = (query: string) => {
    if (!query.trim()) return costCodes;
    
    const lowercaseQuery = query.toLowerCase();
    return costCodes.filter(costCode => 
      costCode.code.toLowerCase().includes(lowercaseQuery) ||
      costCode.name.toLowerCase().includes(lowercaseQuery)
    );
  };

  return { costCodes, searchCostCodes, loading };
}
