import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSelectorProps {
  value: "project-manager" | "owner";
  onChange: (value: "project-manager" | "owner") => void;
  canAccessPMDashboard?: boolean;
  canAccessOwnerDashboard?: boolean;
}

const labels: Record<"project-manager" | "owner", string> = {
  "project-manager": "Project Manager",
  "owner": "Owner",
};

export function DashboardSelector({ 
  value, 
  onChange, 
  canAccessPMDashboard = true, 
  canAccessOwnerDashboard = true 
}: DashboardSelectorProps) {
  // If user only has access to one dashboard, don't show selector
  const availableCount = [canAccessPMDashboard, canAccessOwnerDashboard].filter(Boolean).length;
  if (availableCount <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          {labels[value]}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-background">
        {canAccessPMDashboard && (
          <DropdownMenuItem onClick={() => onChange("project-manager")} className="gap-2">
            <Check className={cn("h-4 w-4", value === "project-manager" ? "opacity-100" : "opacity-0")} />
            Project Manager
          </DropdownMenuItem>
        )}
        {canAccessOwnerDashboard && (
          <DropdownMenuItem onClick={() => onChange("owner")} className="gap-2">
            <Check className={cn("h-4 w-4", value === "owner" ? "opacity-100" : "opacity-0")} />
            Owner
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
