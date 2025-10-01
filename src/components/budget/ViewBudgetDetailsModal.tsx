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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Budget Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-sm text-muted-foreground">Cost Code:</span>
                <p className="font-medium">{costCode.code}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p className="font-medium">{costCode.name}</p>
              </div>
            </div>
          </div>

          {!hasSubcategories ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Cost:</span>
                  <p className="font-medium">{formatCurrency(budgetItem.unit_price)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Unit:</span>
                  <p className="font-medium">{costCode.unit_of_measure || 'EA'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <p className="font-medium">{budgetItem.quantity || 1}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Budget:</span>
                  <p className="font-medium">
                    {formatCurrency((budgetItem.unit_price || 0) * (budgetItem.quantity || 1))}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left w-12"></th>
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-right">Cost</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Subtotal</th>
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
                          <tr key={sub.id} className="border-b">
                            <td className="p-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSubcategory(sub.cost_codes.id, !isSelected)}
                              />
                            </td>
                            <td className="p-2">{sub.cost_codes.code}</td>
                            <td className="p-2">{sub.cost_codes.name}</td>
                            <td className="p-2 text-right">{formatCurrency(sub.unit_price)}</td>
                            <td className="p-2 text-center">{sub.cost_codes.unit_of_measure || 'EA'}</td>
                            <td className="p-2 text-right">{sub.quantity || 1}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(subtotal)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center gap-2 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Total Budget:</span>
                <span className="text-lg font-semibold">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
