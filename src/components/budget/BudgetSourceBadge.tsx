import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
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
        label: 'Bid',
        className: 'bg-green-100 text-green-700 border-green-200',
        tooltip: `From bid: ${item.selected_bid.companies?.company_name || 'Unknown'}`
      };
    }
    
    // Lump sum (unit = "lump-sum" and quantity = 1)
    if (item.unit_price && item.quantity === 1) {
      return {
        label: 'Lump Sum',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        tooltip: 'Lump sum entry'
      };
    }
    
    // Manual entry (has quantity and unit_price)
    if ((item.quantity !== null && item.quantity > 0) || (item.unit_price !== null && item.unit_price > 0)) {
      return {
        label: 'Manual',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        tooltip: 'Manual entry'
      };
    }
    
    // Default to manual for items without data yet
    return {
      label: 'Manual',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      tooltip: 'Manual entry'
    };
  };

  const source = getSourceInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${source.className} cursor-help text-xs`}
          >
            {source.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{source.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
