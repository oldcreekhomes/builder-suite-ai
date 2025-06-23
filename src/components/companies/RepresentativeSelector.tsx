
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search } from "lucide-react";

interface RepresentativeSelectorProps {
  companyId: string | null;
  selectedRepresentatives: string[];
  onRepresentativesChange: (representatives: string[]) => void;
}

export function RepresentativeSelector({ companyId, selectedRepresentatives, onRepresentativesChange }: RepresentativeSelectorProps) {
  const [representativeSearch, setRepresentativeSearch] = useState("");

  // Fetch representatives for selection
  const { data: representatives = [] } = useQuery({
    queryKey: ['company-representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, company_id')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Filter representatives based on search
  const filteredRepresentatives = representatives.filter(rep => 
    rep.first_name.toLowerCase().includes(representativeSearch.toLowerCase()) ||
    rep.last_name.toLowerCase().includes(representativeSearch.toLowerCase())
  );

  const handleRepresentativeToggle = (representativeId: string) => {
    const newSelection = selectedRepresentatives.includes(representativeId)
      ? selectedRepresentatives.filter(id => id !== representativeId)
      : [...selectedRepresentatives, representativeId];
    onRepresentativesChange(newSelection);
  };

  const removeRepresentative = (representativeId: string) => {
    onRepresentativesChange(selectedRepresentatives.filter(id => id !== representativeId));
  };

  return (
    <div className="space-y-4">
      <FormLabel>Associated Representatives</FormLabel>
      
      {/* Selected representatives */}
      {selectedRepresentatives.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
          {selectedRepresentatives.map(representativeId => {
            const representative = representatives.find(rep => rep.id === representativeId);
            return representative ? (
              <Badge key={representativeId} variant="secondary" className="flex items-center gap-1 text-xs">
                {representative.first_name} {representative.last_name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-red-500" 
                  onClick={() => removeRepresentative(representativeId)}
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
          placeholder="Search representatives by name..."
          value={representativeSearch}
          onChange={(e) => setRepresentativeSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Representative selection */}
      <div className="max-h-24 overflow-y-auto border rounded-md">
        {filteredRepresentatives.length === 0 ? (
          <div className="p-2 text-gray-500 text-center text-xs">
            {representativeSearch ? 'No representatives found matching your search' : 'No representatives available'}
          </div>
        ) : (
          filteredRepresentatives.map((representative) => (
            <div
              key={representative.id}
              className="p-2 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => handleRepresentativeToggle(representative.id)}
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedRepresentatives.includes(representative.id)}
                  onCheckedChange={() => handleRepresentativeToggle(representative.id)}
                />
                <div className="text-xs">
                  {representative.first_name} {representative.last_name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
