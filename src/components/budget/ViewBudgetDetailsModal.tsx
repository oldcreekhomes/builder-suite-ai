import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;
type BudgetItem = Tables<'project_budgets'> & {
  cost_codes: CostCode;
};

interface ViewBudgetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem;
  projectId: string;
}

export function ViewBudgetDetailsModal({
  isOpen,
  onClose,
  budgetItem,
  projectId,
}: ViewBudgetDetailsModalProps) {
  const costCode = budgetItem.cost_codes;
  const hasSubcategories = costCode.has_subcategories;

  const {
    subcategories,
    selections,
    toggleSubcategory,
    calculatedTotal,
    isLoading,
  } = useBudgetSubcategories(budgetItem.id, costCode.id, projectId, hasSubcategories);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {costCode.code} - {costCode.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {!hasSubcategories ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium">Cost</th>
                    <th className="p-3 text-left text-sm font-medium">Unit</th>
                    <th className="p-3 text-left text-sm font-medium">Quantity</th>
                    <th className="p-3 text-right text-sm font-medium">Total Budget</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3">{formatCurrency(budgetItem.unit_price)}</td>
                    <td className="p-3">{costCode.unit_of_measure || 'EA'}</td>
                    <td className="p-3">{budgetItem.quantity || 1}</td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency((budgetItem.unit_price || 0) * (budgetItem.quantity || 1))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left w-12 text-sm font-medium"></th>
                      <th className="p-3 text-left text-sm font-medium">Code</th>
                      <th className="p-3 text-left text-sm font-medium">Name</th>
                      <th className="p-3 text-right text-sm font-medium">Cost</th>
                      <th className="p-3 text-center text-sm font-medium">Unit</th>
                      <th className="p-3 text-right text-sm font-medium">Quantity</th>
                      <th className="p-3 text-right text-sm font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          Loading subcategories...
                        </td>
                      </tr>
                    ) : subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          No subcategories found
                        </td>
                      </tr>
                    ) : (
                      subcategories.map((sub) => {
                        const isSelected = selections[sub.cost_codes.id] !== false;
                        const subtotal = (sub.unit_price || 0) * (sub.quantity || 1);
                        
                        return (
                          <tr key={sub.id} className="border-b last:border-0">
                            <td className="p-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSubcategory(sub.cost_codes.id, !isSelected)}
                              />
                            </td>
                            <td className="p-3">{sub.cost_codes.code}</td>
                            <td className="p-3">{sub.cost_codes.name}</td>
                            <td className="p-3 text-right">{formatCurrency(sub.unit_price)}</td>
                            <td className="p-3 text-center">{sub.cost_codes.unit_of_measure || 'EA'}</td>
                            <td className="p-3 text-right">{sub.quantity || 1}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(subtotal)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Total Budget:</span>
                <span className="text-lg font-semibold">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
