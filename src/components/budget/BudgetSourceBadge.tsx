import { Badge } from "@/components/ui/badge";
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
        label: 'Bid',
        icon: ShoppingCart,
        className: 'bg-green-50 text-green-700 border-green-200',
        tooltip: `From bid: ${item.selected_bid.companies?.company_name || 'Unknown'}`
      };
    }
    
    // Lump sum (unit = "lump-sum" and quantity = 1)
    if (item.unit_price && item.quantity === 1) {
      return {
        type: 'lump-sum',
        label: 'Lump Sum',
        icon: DollarSign,
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        tooltip: 'Lump sum entry'
      };
    }
    
    // Manual entry (has quantity and unit_price)
    if ((item.quantity !== null && item.quantity > 0) || (item.unit_price !== null && item.unit_price > 0)) {
      return {
        type: 'manual',
        label: 'Manual',
        icon: FileText,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        tooltip: 'Manual entry'
      };
    }
    
    // Default to manual for items without data yet
    return {
      type: 'manual',
      label: 'Manual',
      icon: FileText,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      tooltip: 'Manual entry'
    };
  };

  const source = getSourceInfo();
  const Icon = source.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-5 cursor-help gap-1 ${source.className}`}
          >
            <Icon className="h-3 w-3" />
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
