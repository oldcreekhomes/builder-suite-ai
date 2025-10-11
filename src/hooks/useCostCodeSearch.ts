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
        const { data, error } = await supabase
          .from('cost_codes')
          .select('id, code, name, category')
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