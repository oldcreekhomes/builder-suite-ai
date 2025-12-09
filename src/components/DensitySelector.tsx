import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDensity, Density } from "@/contexts/DensityContext";

const densityOptions: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "cozy", label: "Cozy" },
  { value: "compact", label: "Compact" },
];

export function DensitySelector() {
  const { density, setDensity } = useDensity();

  const currentLabel = densityOptions.find(opt => opt.value === density)?.label || "Comfortable";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          {currentLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-background">
        {densityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setDensity(option.value)}
            className="gap-2"
          >
            <Check
              className={cn(
                "h-4 w-4",
                density === option.value ? "opacity-100" : "opacity-0"
              )}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
