import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import { useBudgetBidSelection } from "@/hooks/useBudgetBidSelection";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;
type BudgetItem = Tables<'project_budgets'> & {
  cost_codes: CostCode;
  unit_price?: number;
};

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItem: BudgetItem & { cost_codes: CostCode };
  projectId: string;
  currentSelectedBidId?: string | null;
  onBidSelected: (bidId: string | null) => void;
}

export function BudgetDetailsModal({
  isOpen,
  onClose,
  budgetItem,
  projectId,
  currentSelectedBidId,
  onBidSelected,
}: BudgetDetailsModalProps) {
  const costCode = budgetItem.cost_codes;
  const [activeTab, setActiveTab] = useState("estimate");
  
  // Estimate tab state and logic
  const { 
    subcategories, 
    selections,
    toggleSubcategory, 
    updateQuantity,
    calculatedTotal
  } = useBudgetSubcategories(budgetItem.id, costCode.id, projectId);
  
  const hasSubcategories = subcategories.length > 0;

  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Vendor Bid tab state and logic
  const { availableBids, selectBid, isLoading } = useBudgetBidSelection(projectId, costCode.id);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(currentSelectedBidId || null);

  useEffect(() => {
    setSelectedBidId(currentSelectedBidId || null);
  }, [currentSelectedBidId]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const truncateUnit = (unit: string | null | undefined) => {
    if (!unit) return '';
    const unitMap: Record<string, string> = {
      'square-feet': 'SF',
      'linear-feet': 'LF',
      'cubic-yard': 'CY',
      'square-yard': 'SY',
      'lump-sum': 'LS',
      'each': 'EA',
      'hour': 'HR',
      'month': 'MO'
    };
    return unitMap[unit] || unit;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleQuantityEdit = (subcategoryId: string, currentQuantity: number) => {
    setEditingQuantityId(subcategoryId);
    setEditingValue(currentQuantity?.toString() || '0');
  };

  const handleQuantityBlur = (subcategory: BudgetItem) => {
    const newQuantity = parseFloat(editingValue) || 0;
    updateQuantity(subcategory.id, subcategory.cost_codes.id, newQuantity);
    setEditingQuantityId(null);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent, subcategory: BudgetItem) => {
    if (e.key === 'Enter') {
      handleQuantityBlur(subcategory);
    } else if (e.key === 'Escape') {
      setEditingQuantityId(null);
    }
  };

  const handleApplyBid = () => {
    selectBid(
      { budgetItemId: budgetItem.id, bidId: selectedBidId },
      {
        onSuccess: () => {
          onBidSelected(selectedBidId);
          onClose();
        }
      }
    );
  };

  const handleClearBid = () => {
    selectBid(
      { budgetItemId: budgetItem.id, bidId: null },
      {
        onSuccess: () => {
          onBidSelected(null);
          onClose();
        }
      }
    );
  };

  const calculateEstimateTotal = () => {
    if (!hasSubcategories || subcategories.length === 0) {
      const quantity = parseFloat(budgetItem.quantity?.toString() || '0');
      const unitPrice = parseFloat(budgetItem.unit_price?.toString() || '0');
      return quantity * unitPrice;
    }

    return calculatedTotal;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Budget Details
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {costCode.code} - {costCode.name}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="vendor-bid">Vendor Bid</TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="flex-1 overflow-auto mt-4">
            {!hasSubcategories ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Cost Code</th>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                        <th className="text-center p-3 text-sm font-medium">Unit</th>
                        <th className="text-right p-3 text-sm font-medium">Quantity</th>
                        <th className="text-right p-3 text-sm font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3 text-sm">{costCode.code}</td>
                        <td className="p-3 text-sm">{costCode.name}</td>
                        <td className="p-3 text-sm text-right">
                          {formatCurrency(budgetItem.unit_price)}
                        </td>
                        <td className="p-3 text-sm text-center">
                          {truncateUnit(costCode.unit_of_measure)}
                        </td>
                        <td className="p-3 text-sm text-right">
                          {budgetItem.quantity || 0}
                        </td>
                        <td className="p-3 text-sm text-right font-medium">
                          {formatCurrency(calculateEstimateTotal())}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(calculateEstimateTotal())}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="w-12 p-3"></th>
                        <th className="text-left p-3 text-sm font-medium">Cost Code</th>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                        <th className="text-center p-3 text-sm font-medium">Unit</th>
                        <th className="text-right p-3 text-sm font-medium">Quantity</th>
                        <th className="text-right p-3 text-sm font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcategories.map((subcategory) => {
                        const isSelected = selections[subcategory.cost_codes.id] !== false;
                        const quantity = parseFloat(subcategory.quantity?.toString() || '0');
                        const unitPrice = parseFloat(subcategory.unit_price?.toString() || '0');
                        const subtotal = quantity * unitPrice;

                        return (
                          <tr 
                            key={subcategory.id} 
                            className={`border-t ${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleSubcategory(subcategory.cost_codes.id, checked as boolean)}
                              />
                            </td>
                            <td className="p-3 text-sm">{subcategory.cost_codes?.code}</td>
                            <td className="p-3 text-sm">{subcategory.cost_codes?.name}</td>
                            <td className="p-3 text-sm text-right">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="p-3 text-sm text-center">
                              {truncateUnit(subcategory.cost_codes?.unit_of_measure)}
                            </td>
                            <td className="p-3 text-sm text-right">
                              {editingQuantityId === subcategory.id ? (
                                <input
                                  type="number"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleQuantityBlur(subcategory)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, subcategory)}
                                  className="w-20 px-2 py-1 text-right border rounded"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="cursor-text hover:bg-muted rounded px-2 py-1"
                                  onClick={() => handleQuantityEdit(subcategory.id, quantity)}
                                >
                                  {quantity}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-right font-medium">
                              {formatCurrency(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(calculateEstimateTotal())}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vendor-bid" className="flex-1 overflow-auto mt-4">
            <div className="space-y-3 max-w-2xl mx-auto">
              {availableBids.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No bids available for this cost code yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can still enter manual pricing in the budget table.
                  </p>
                </div>
              ) : (
                <RadioGroup value={selectedBidId || ''} onValueChange={setSelectedBidId}>
                  <div className="space-y-2">
                    {availableBids.map((bid) => (
                      <div
                        key={bid.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedBidId === bid.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedBidId(bid.id)}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={bid.id} id={bid.id} className="mt-1" />
                          <Label htmlFor={bid.id} className="flex-1 cursor-pointer">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="font-medium text-sm">
                                  {bid.companies?.company_name || 'Unknown Company'}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getStatusColor(bid.packageStatus || 'pending')}`}
                                  >
                                    {bid.packageStatus || 'Pending'}
                                  </Badge>
                                  {bid.packageDueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {format(new Date(bid.packageDueDate), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-base">
                                  {formatCurrency(bid.price)}
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          {activeTab === "vendor-bid" && currentSelectedBidId && (
            <Button
              variant="outline"
              onClick={handleClearBid}
              disabled={isLoading}
            >
              Clear Selection
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            {activeTab === "estimate" ? "Close" : "Cancel"}
          </Button>
          {activeTab === "vendor-bid" && (
            <Button 
              onClick={handleApplyBid} 
              disabled={!selectedBidId || isLoading || selectedBidId === currentSelectedBidId}
            >
              {isLoading ? 'Applying...' : 'Apply'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
