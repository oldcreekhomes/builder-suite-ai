import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type BudgetItem = Tables<'project_budgets'>;
type CostCode = Tables<'cost_codes'>;

interface BudgetSourceBadgeProps {
  item: BudgetItem & {
    selected_bid?: any;
    cost_codes?: CostCode;
  };
}

export function BudgetSourceBadge({ item }: BudgetSourceBadgeProps) {
  // Determine source type based on data
  const getSourceInfo = () => {
    // Has selected bid - show "Vendor Bid"
    if (item.selected_bid_id && item.selected_bid) {
      return {
        label: 'Vendor Bid',
        className: 'bg-green-100 text-green-700 border-green-200',
        tooltip: `From bid: ${item.selected_bid.companies?.company_name || 'Unknown'}`
      };
    }
    
    // Has subcategories selected - show "Estimate"
    const costCode = item.cost_codes;
    if (costCode?.has_subcategories) {
      return {
        label: 'Estimate',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        tooltip: 'From estimate with subcategories'
      };
    }
    
    // TODO: Add Historical Data detection when that feature is implemented
    // For now, we'll check if it was imported from a historical project
    // This would need a field like `imported_from_historical` or similar
    
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
