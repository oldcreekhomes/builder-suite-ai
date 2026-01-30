import { Check, AlertTriangle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type POStatus = 'matched' | 'over_po' | 'no_po' | 'partial';

interface POStatusBadgeProps {
  status: POStatus;
  onClick?: () => void;
  className?: string;
}

export function POStatusBadge({ status, onClick, className }: POStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'matched':
        return {
          icon: Check,
          label: 'Matched',
          tooltip: 'Bill matches PO and is within budget',
          bgClass: 'bg-green-100 hover:bg-green-200 text-green-700 border-green-200',
          iconClass: 'text-green-600',
        };
      case 'over_po':
        return {
          icon: AlertTriangle,
          label: 'Over',
          tooltip: 'Cumulative bills exceed PO amount',
          bgClass: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-200',
          iconClass: 'text-yellow-600',
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          label: 'Partial',
          tooltip: 'Some cost codes match PO, others exceed',
          bgClass: 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200',
          iconClass: 'text-orange-600',
        };
      case 'no_po':
      default:
        return {
          icon: null,
          label: 'No PO',
          tooltip: 'No matching purchase order found',
          bgClass: 'bg-muted hover:bg-muted/80 text-muted-foreground border-muted',
          iconClass: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer transition-colors gap-1 text-xs px-2 py-0.5",
              config.bgClass,
              className
            )}
            onClick={onClick}
          >
            {Icon && <Icon className={cn("h-3 w-3", config.iconClass)} />}
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
