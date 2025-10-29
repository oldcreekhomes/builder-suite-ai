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
    // Check budget_source field first (new system)
    if (item.budget_source) {
      switch (item.budget_source) {
        case 'vendor-bid':
          return {
            label: 'Vendor Bid',
            className: 'bg-green-100 text-green-700 border-green-200',
            tooltip: `From bid: ${item.selected_bid?.companies?.company_name || 'Vendor bid'}`
          };
        case 'estimate':
          return {
            label: 'Estimate',
            className: 'bg-blue-100 text-blue-700 border-blue-200',
            tooltip: 'From estimate with subcategories'
          };
        case 'historical':
          return {
            label: 'Historical',
            className: 'bg-purple-100 text-purple-700 border-purple-200',
            tooltip: 'From historical project actual costs'
          };
        case 'settings':
          return {
            label: 'Settings',
            className: 'bg-orange-100 text-orange-700 border-orange-200',
            tooltip: 'From default cost code settings'
          };
        case 'manual':
          return {
            label: 'Manual',
            className: 'bg-gray-100 text-gray-700 border-gray-200',
            tooltip: 'Manual entry'
          };
      }
    }

    // Legacy logic for items without budget_source set
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
    <Badge 
      variant="outline" 
      className={`${source.className} text-xs`}
    >
      {source.label}
    </Badge>
  );
}
