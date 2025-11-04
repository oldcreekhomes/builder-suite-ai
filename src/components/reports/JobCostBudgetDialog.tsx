import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetDetailsModal } from "@/components/budget/BudgetDetailsModal";
import { useBudgetLockStatus } from "@/hooks/useBudgetLockStatus";

interface JobCostBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: string;
  costCodeName: string;
  projectId: string;
  totalBudget: number;
}

export function JobCostBudgetDialog({
  isOpen,
  onClose,
  costCode,
  costCodeName,
  projectId,
  totalBudget,
}: JobCostBudgetDialogProps) {
  const { isLocked } = useBudgetLockStatus(projectId);
  
  const { data: budgetItem, isLoading } = useQuery({
    queryKey: ['job-cost-budget-details', projectId, costCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes!inner(*)
        `)
        .eq('project_id', projectId)
        .eq('cost_codes.code', costCode)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!projectId && !!costCode,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-8 w-8" />
      </div>
    );
  }

  if (!budgetItem) {
    return null;
  }

  return (
    <BudgetDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      budgetItem={budgetItem}
      projectId={projectId}
      currentSelectedBidId={budgetItem.selected_bid_id}
      onBidSelected={onClose}
      isLocked={isLocked}
    />
  );
}
