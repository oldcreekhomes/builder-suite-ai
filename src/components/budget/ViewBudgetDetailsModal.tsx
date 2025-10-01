import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import type { Tables } from "@/integrations/supabase/types";

interface ViewBudgetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: Tables<'project_budgets'> & {
    cost_codes: Tables<'cost_codes'> | null;
  };
  projectId: string;
}

export function ViewBudgetDetailsModal({
  isOpen,
  onClose,
  budgetItem,
  projectId,
}: ViewBudgetDetailsModalProps) {
  const costCode = budgetItem.cost_codes;
  
  const {
    subcategories,
    selections,
    toggleSelection,
    calculatedTotal,
    isLoading,
  } = useBudgetSubcategories(budgetItem.id, costCode?.code || '', projectId);

  if (!costCode) return null;

  const hasSubcategories = costCode.has_subcategories;
  const simpleTotal = (budgetItem.quantity || 0) * (budgetItem.unit_price || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Budget Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <p className="text-sm text-muted-foreground">Cost Code</p>
              <p className="font-medium">{costCode.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{costCode.name}</p>
            </div>
          </div>

          {!hasSubcategories ? (
            // Simple view for items without subcategories
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-medium">${budgetItem.unit_price?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{costCode.unit_of_measure || 'EA'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{budgetItem.quantity || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="font-medium">${simpleTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            // List view for items with subcategories
            <div className="space-y-3">
              <p className="text-sm font-medium">Select subcategories to include in total:</p>
              
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading subcategories...</p>
              ) : subcategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subcategories found</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 text-sm font-medium">
                    <div></div>
                    <div>Code</div>
                    <div>Name</div>
                    <div className="text-right">Cost</div>
                    <div className="text-right">Qty</div>
                    <div className="text-right">Subtotal</div>
                  </div>
                  
                  {subcategories.map((sub) => {
                    const isSelected = selections[sub.budgetItem.id] ?? true;
                    const subtotal = (sub.budgetItem.quantity || 0) * (sub.budgetItem.unit_price || 0);
                    
                    return (
                      <div
                        key={sub.budgetItem.id}
                        className="px-4 py-3 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 border-t items-center hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(sub.budgetItem.id, sub.costCode.id)}
                        />
                        <div className="text-sm">{sub.costCode.code}</div>
                        <div className="text-sm">{sub.costCode.name}</div>
                        <div className="text-sm text-right">
                          ${sub.budgetItem.unit_price?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-right">
                          {sub.budgetItem.quantity || 0}
                        </div>
                        <div className="text-sm text-right font-medium">
                          ${subtotal.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t flex justify-between items-center">
                <p className="font-medium">Total Budget:</p>
                <p className="text-lg font-bold">${calculatedTotal.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
