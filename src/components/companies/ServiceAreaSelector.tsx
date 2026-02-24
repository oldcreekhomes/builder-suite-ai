import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceAreaSelectorProps {
  selectedAreas: string[];
  onAreasChange: (areas: string[]) => void;
}

const SERVICE_AREAS = ["Washington, DC", "Outer Banks, NC"] as const;

export function ServiceAreaSelector({ selectedAreas, onAreasChange }: ServiceAreaSelectorProps) {
  const toggleArea = useCallback((area: string) => {
    if (selectedAreas.includes(area)) {
      onAreasChange(selectedAreas.filter(a => a !== area));
    } else {
      onAreasChange([...selectedAreas, area]);
    }
  }, [selectedAreas, onAreasChange]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-10 font-normal"
        >
          {selectedAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {selectedAreas.map(area => (
                <Badge key={area} variant="secondary" className="text-xs gap-1">
                  {area}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArea(area);
                    }}
                  />
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Select areas...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1 bg-popover z-50" align="start">
        {SERVICE_AREAS.map(area => (
          <div
            key={area}
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
            onClick={() => toggleArea(area)}
          >
            <input
              type="checkbox"
              checked={selectedAreas.includes(area)}
              readOnly
              className="h-3.5 w-3.5 rounded border border-input accent-primary cursor-pointer"
            />
            {area}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
