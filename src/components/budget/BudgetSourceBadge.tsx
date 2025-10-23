import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, History, DollarSign, ShoppingCart } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type BudgetItem = Tables<'project_budgets'>;

interface BudgetSourceBadgeProps {
  item: BudgetItem & {
    selected_bid?: any;
  };
}

export function BudgetSourceBadge({ item }: BudgetSourceBadgeProps) {
  // Determine source type based on data
  const getSourceInfo = () => {
    // Has selected bid
    if (item.selected_bid_id && item.selected_bid) {
      return {
        type: 'bid',
        icon: ShoppingCart,
        className: 'text-green-600',
        tooltip: `From bid: ${item.selected_bid.companies?.company_name || 'Unknown'}`
      };
    }
    
    // Lump sum (unit = "lump-sum" and quantity = 1)
    if (item.unit_price && item.quantity === 1) {
      return {
        type: 'lump-sum',
        icon: DollarSign,
        className: 'text-purple-600',
        tooltip: 'Lump sum entry'
      };
    }
    
    // Manual entry (has quantity and unit_price)
    if ((item.quantity !== null && item.quantity > 0) || (item.unit_price !== null && item.unit_price > 0)) {
      return {
        type: 'manual',
        icon: FileText,
        className: 'text-muted-foreground',
        tooltip: 'Manual entry'
      };
    }
    
    // Default to manual for items without data yet
    return {
      type: 'manual',
      icon: FileText,
      className: 'text-muted-foreground',
      tooltip: 'Manual entry'
    };
  };

  const source = getSourceInfo();
  const Icon = source.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <Icon className={`h-4 w-4 ${source.className}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{source.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
