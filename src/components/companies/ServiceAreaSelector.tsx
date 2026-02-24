import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ServiceAreaSelectorProps {
  selectedAreas: string[];
  onAreasChange: (areas: string[]) => void;
}

// Fetch distinct service areas already in use
function useExistingServiceAreas() {
  return useQuery({
    queryKey: ["distinct-service-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("service_areas")
        .not("service_areas", "eq", "{}");

      if (error) throw error;

      const areaSet = new Set<string>();
      for (const row of data || []) {
        const areas = row.service_areas as string[] | null;
        if (areas) {
          for (const a of areas) areaSet.add(a);
        }
      }

      // Also pull distinct regions from projects
      const { data: projectData } = await supabase
        .from("projects")
        .select("region")
        .not("region", "is", null);

      for (const row of projectData || []) {
        if (row.region) areaSet.add(row.region);
      }

      return Array.from(areaSet).sort();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function ServiceAreaSelector({ selectedAreas, onAreasChange }: ServiceAreaSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const { data: existingAreas = [] } = useExistingServiceAreas();

  const addArea = useCallback((area: string) => {
    const trimmed = area.trim();
    if (trimmed && !selectedAreas.includes(trimmed)) {
      onAreasChange([...selectedAreas, trimmed]);
    }
    setInputValue("");
  }, [selectedAreas, onAreasChange]);

  const removeArea = useCallback((area: string) => {
    onAreasChange(selectedAreas.filter(a => a !== area));
  }, [selectedAreas, onAreasChange]);

  const suggestions = existingAreas.filter(
    a => !selectedAreas.includes(a) && a.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selectedAreas.map(area => (
          <Badge key={area} variant="secondary" className="gap-1 text-xs">
            {area}
            <X className="h-3 w-3 cursor-pointer" onClick={() => removeArea(area)} />
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Type a service area..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (inputValue.trim()) addArea(inputValue);
            }
          }}
          className="text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => { if (inputValue.trim()) addArea(inputValue); }}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {inputValue && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.slice(0, 5).map(area => (
            <Badge
              key={area}
              variant="outline"
              className="cursor-pointer text-xs hover:bg-muted"
              onClick={() => addArea(area)}
            >
              + {area}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
