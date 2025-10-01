import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import type { Tables } from "@/integrations/supabase/types";
import { useState } from "react";

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
    updateQuantity,
    calculatedTotal,
    isLoading,
  } = useBudgetSubcategories(budgetItem.id, costCode.id, projectId, hasSubcategories);

  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantities, setTempQuantities] = useState<Record<string, string>>({});

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const truncateUnit = (unit: string | null | undefined) => {
    if (!unit) return 'EA';
    const upperUnit = unit.toUpperCase();
    // Handle common unit abbreviations
    if (upperUnit.includes('LINEAR') || upperUnit.includes('LF')) return 'LF';
    if (upperUnit.includes('SQUARE') || upperUnit.includes('SF')) return 'SF';
    if (upperUnit.includes('CUBIC') || upperUnit.includes('CF')) return 'CF';
    if (upperUnit.includes('EACH')) return 'EA';
    // Default to first 2 characters
    return unit.substring(0, 2).toUpperCase();
  };

  const handleQuantityClick = (subcategoryId: string, currentQuantity: number) => {
    setEditingQuantity(subcategoryId);
    setTempQuantities(prev => ({ ...prev, [subcategoryId]: currentQuantity.toString() }));
  };

  const handleQuantityBlur = (budgetId: string, costCodeId: string, subcategoryId: string) => {
    const value = tempQuantities[subcategoryId]?.trim();
    const newQuantity = value ? parseFloat(value) : 1;
    if (!isNaN(newQuantity) && newQuantity > 0) {
      updateQuantity(budgetId, costCodeId, newQuantity);
    }
    setEditingQuantity(null);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, budgetId: string, costCodeId: string, subcategoryId: string) => {
    if (e.key === 'Enter') {
      handleQuantityBlur(budgetId, costCodeId, subcategoryId);
    } else if (e.key === 'Escape') {
      setEditingQuantity(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {costCode.code} - {costCode.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {!hasSubcategories ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="py-1 px-2 text-left text-xs font-medium">Code</th>
                      <th className="py-1 px-2 text-left text-xs font-medium">Name</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Cost</th>
                      <th className="py-1 px-2 text-center text-xs font-medium">Unit</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Quantity</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 px-2 text-xs">{costCode.code}</td>
                      <td className="py-1 px-2 text-xs">{costCode.name}</td>
                      <td className="py-1 px-2 text-right text-xs">{formatCurrency(budgetItem.unit_price)}</td>
                      <td className="py-1 px-2 text-center text-xs">{truncateUnit(costCode.unit_of_measure)}</td>
                      <td className="py-1 px-2 text-right text-xs">{budgetItem.quantity || 1}</td>
                      <td className="py-1 px-2 text-right font-medium text-xs">
                        {formatCurrency((budgetItem.unit_price || 0) * (budgetItem.quantity || 1))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t">
                <span className="text-xs font-medium text-muted-foreground">Total Budget:</span>
                <span className="text-base font-semibold">{formatCurrency((budgetItem.unit_price || 0) * (budgetItem.quantity || 1))}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="py-1 px-2 text-left w-8 text-xs font-medium"></th>
                      <th className="py-1 px-2 text-left text-xs font-medium">Code</th>
                      <th className="py-1 px-2 text-left text-xs font-medium">Name</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Cost</th>
                      <th className="py-1 px-2 text-center text-xs font-medium">Unit</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Quantity</th>
                      <th className="py-1 px-2 text-right text-xs font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-2 px-2 text-center text-muted-foreground text-xs">
                          Loading subcategories...
                        </td>
                      </tr>
                    ) : subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-2 px-2 text-center text-muted-foreground text-xs">
                          No subcategories found
                        </td>
                      </tr>
                    ) : (
                      subcategories.map((sub) => {
                        const isSelected = selections[sub.cost_codes.id] !== false;
                        const subtotal = (sub.unit_price || 0) * (sub.quantity || 1);
                        const isEditing = editingQuantity === sub.id;
                        
                        return (
                          <tr key={sub.id} className="border-b last:border-0">
                            <td className="py-1 px-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSubcategory(sub.cost_codes.id, !isSelected)}
                                className="h-3 w-3"
                              />
                            </td>
                            <td className="py-1 px-2 text-xs">{sub.cost_codes.code}</td>
                            <td className="py-1 px-2 text-xs">{sub.cost_codes.name}</td>
                            <td className="py-1 px-2 text-right text-xs">{formatCurrency(sub.unit_price)}</td>
                            <td className="py-1 px-2 text-center text-xs">{truncateUnit(sub.cost_codes.unit_of_measure)}</td>
                            <td className="px-2 py-0 w-24 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={tempQuantities[sub.id] ?? ''}
                                  onChange={(e) => setTempQuantities(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  onBlur={() => handleQuantityBlur(sub.id, sub.cost_code_id, sub.id)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, sub.id, sub.cost_code_id, sub.id)}
                                  className="bg-transparent border-none outline-none text-xs w-full p-0 text-right focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  style={{ caretColor: "black", fontSize: "inherit", fontFamily: "inherit" }}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => handleQuantityClick(sub.id, sub.quantity || 1)}
                                  className="cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap text-right w-full"
                                >
                                  {sub.quantity || 1}
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-right font-medium text-xs">{formatCurrency(subtotal)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t">
                <span className="text-xs font-medium text-muted-foreground">Total Budget:</span>
                <span className="text-base font-semibold">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
