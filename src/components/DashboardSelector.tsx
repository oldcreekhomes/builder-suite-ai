import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardView } from "@/hooks/useDashboardPermissions";

interface DashboardSelectorProps {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
  canAccessPMDashboard?: boolean;
  canAccessOwnerDashboard?: boolean;
  canAccessAccountantDashboard?: boolean;
}

const labels: Record<DashboardView, string> = {
  "project-manager": "Project Manager",
  "owner": "Owner",
  "accountant": "Accountant",
};

export function DashboardSelector({ 
  value, 
  onChange, 
  canAccessPMDashboard = true, 
  canAccessOwnerDashboard = true,
  canAccessAccountantDashboard = false,
}: DashboardSelectorProps) {
  // If user only has access to one dashboard, don't show selector
  const availableCount = [canAccessPMDashboard, canAccessOwnerDashboard, canAccessAccountantDashboard].filter(Boolean).length;
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
        {canAccessAccountantDashboard && (
          <DropdownMenuItem onClick={() => onChange("accountant")} className="gap-2">
            <Check className={cn("h-4 w-4", value === "accountant" ? "opacity-100" : "opacity-0")} />
            Accountant
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
