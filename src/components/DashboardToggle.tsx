import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardToggleProps {
  value: "project-manager" | "owner";
  onChange: (value: "project-manager" | "owner") => void;
}

export function DashboardToggle({ value, onChange }: DashboardToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("project-manager")}
        className={cn(
          "rounded-md px-3 h-7 text-xs font-medium transition-all",
          value === "project-manager"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        PM
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("owner")}
        className={cn(
          "rounded-md px-3 h-7 text-xs font-medium transition-all",
          value === "owner"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        )}
      >
        Owner
      </Button>
    </div>
  );
}
