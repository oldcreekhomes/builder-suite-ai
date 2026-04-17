import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import {
  getBudgetSourceLabel,
  getBudgetSourceBadgeClassName,
} from "@/utils/budgetSource";

type BudgetItem = Tables<'project_budgets'>;
type CostCode = Tables<'cost_codes'>;

interface BudgetSourceBadgeProps {
  item: BudgetItem & {
    selected_bid?: any;
    cost_codes?: CostCode;
  };
}

export function BudgetSourceBadge({ item }: BudgetSourceBadgeProps) {
  const label = getBudgetSourceLabel(item);
  const className = getBudgetSourceBadgeClassName(item);

  return (
    <Badge variant="outline" className={`${className} text-xs`}>
      {label}
    </Badge>
  );
}
