
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search } from "lucide-react";

interface CostCodeSelectorProps {
  companyId: string | null;
  selectedCostCodes: string[];
  onCostCodesChange: (costCodes: string[]) => void;
}

export function CostCodeSelector({ companyId, selectedCostCodes, onCostCodesChange }: CostCodeSelectorProps) {
  const [costCodeSearch, setCostCodeSearch] = useState("");

  // Fetch cost codes for selection
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .order('code');
      
      if (error) throw error;
      return data;
    },
  });

  // Filter cost codes based on search
  const filteredCostCodes = costCodes.filter(costCode => 
    costCode.code.toLowerCase().includes(costCodeSearch.toLowerCase()) ||
    costCode.name.toLowerCase().includes(costCodeSearch.toLowerCase())
  );

  const handleCostCodeToggle = (costCodeId: string) => {
    const newSelection = selectedCostCodes.includes(costCodeId)
      ? selectedCostCodes.filter(id => id !== costCodeId)
      : [...selectedCostCodes, costCodeId];
    onCostCodesChange(newSelection);
  };

  const removeCostCode = (costCodeId: string) => {
    onCostCodesChange(selectedCostCodes.filter(id => id !== costCodeId));
  };

  return (
    <div className="space-y-4">
      <FormLabel>Associated Cost Codes</FormLabel>
      
      {/* Selected cost codes */}
      {selectedCostCodes.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
          {selectedCostCodes.map(costCodeId => {
            const costCode = costCodes.find(cc => cc.id === costCodeId);
            return costCode ? (
              <Badge key={costCodeId} variant="secondary" className="flex items-center gap-1 text-xs">
                {costCode.code} - {costCode.name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-red-500" 
                  onClick={() => removeCostCode(costCodeId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search cost codes by number or name..."
          value={costCodeSearch}
          onChange={(e) => setCostCodeSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cost code selection - Fixed double event handling */}
      <div className="max-h-24 overflow-y-auto border rounded-md">
        {filteredCostCodes.length === 0 ? (
          <div className="p-2 text-gray-500 text-center text-xs">
            {costCodeSearch ? 'No cost codes found matching your search' : 'No cost codes available'}
          </div>
        ) : (
          filteredCostCodes.map((costCode) => (
            <div
              key={costCode.id}
              className="p-2 border-b hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedCostCodes.includes(costCode.id)}
                  onCheckedChange={() => handleCostCodeToggle(costCode.id)}
                />
                <div className="text-xs cursor-pointer" onClick={() => handleCostCodeToggle(costCode.id)}>
                  <span className="font-medium">{costCode.code}</span> - {costCode.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
