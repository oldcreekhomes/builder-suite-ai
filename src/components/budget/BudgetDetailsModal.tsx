import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import { useBudgetBidSelection } from "@/hooks/useBudgetBidSelection";
import { useBudgetSourceUpdate } from "@/hooks/useBudgetSourceUpdate";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
  isLocked?: boolean;
}

export function BudgetDetailsModal({
  isOpen,
  onClose,
  budgetItem,
  projectId,
  currentSelectedBidId,
  onBidSelected,
  isLocked = false,
}: BudgetDetailsModalProps) {
  const costCode = budgetItem.cost_codes;
  const { openProposalFile } = useUniversalFilePreviewContext();
  
  // Estimate tab state and logic
  const { 
    subcategories, 
    selections,
    toggleSubcategory, 
    updateQuantity,
    calculatedTotal
  } = useBudgetSubcategories(budgetItem.id, costCode.id, projectId);
  
  const hasSubcategories = subcategories.length > 0;
  
  // Determine initial tab based on budget_source
  const getInitialTab = () => {
    if (budgetItem.budget_source) {
      const source = budgetItem.budget_source;
      // Only return valid tabs: estimate, vendor-bid, or manual
      if (source === 'vendor-bid' || source === 'manual') {
        return source;
      }
      // If source is 'estimate' but no subcategories, default to vendor-bid
      if (source === 'estimate' && !hasSubcategories) {
        return 'vendor-bid';
      }
    }
    // Default to vendor-bid if no subcategories, otherwise estimate
    return hasSubcategories ? 'estimate' : 'vendor-bid';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());

  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Vendor Bid tab state and logic
  const { availableBids, selectBid, isLoading: isBidLoading } = useBudgetBidSelection(projectId, costCode.id);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(currentSelectedBidId || null);

  // Manual tab state - store as strings to allow empty inputs
  const [manualQuantityInput, setManualQuantityInput] = useState<string>(budgetItem.quantity?.toString() || '');
  const [manualUnitPriceInput, setManualUnitPriceInput] = useState<string>(budgetItem.unit_price?.toString() || '');

  // Budget source update hook
  const { updateSource, isUpdating } = useBudgetSourceUpdate(projectId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedBidId(currentSelectedBidId || null);
  }, [currentSelectedBidId]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [budgetItem.budget_source]);

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

  const handleApply = async () => {
    if (isLocked) return; // No-op when locked
    
    const source = activeTab as 'estimate' | 'vendor-bid' | 'manual';
    
    if (source === 'vendor-bid') {
      selectBid(
        { budgetItemId: budgetItem.id, bidId: selectedBidId },
        {
          onSuccess: () => {
            updateSource({
              budgetItemId: budgetItem.id,
              source: 'vendor-bid',
            });
            onBidSelected(selectedBidId);
            onClose();
          }
        }
      );
    } else if (source === 'manual') {
      updateSource({
        budgetItemId: budgetItem.id,
        source: 'manual',
        manualQuantity: parseFloat(manualQuantityInput) || 0,
        manualUnitPrice: parseFloat(manualUnitPriceInput) || 0,
      });
      onClose();
    } else if (source === 'estimate') {
      // Persist all selections and child budget items
      try {
        // 1. Upsert all selections
        const selectionsToUpsert = subcategories.map(sub => ({
          project_budget_id: budgetItem.id,
          cost_code_id: sub.cost_codes.id,
          included: selections[sub.cost_codes.id] !== false, // Default to true
        }));

        const { error: selectionsError } = await supabase
          .from('budget_subcategory_selections')
          .upsert(selectionsToUpsert, { 
            onConflict: 'project_budget_id,cost_code_id' 
          });

        if (selectionsError) throw selectionsError;

        // 2. Query existing child budget items and upsert by primary key
        const includedCostCodeIds = subcategories
          .filter(sub => selections[sub.cost_codes.id] !== false)
          .map(sub => sub.cost_codes.id);

        if (includedCostCodeIds.length > 0) {
          // Fetch existing rows to get their IDs
          const { data: existingRows, error: existingErr } = await supabase
            .from('project_budgets')
            .select('id, cost_code_id')
            .eq('project_id', projectId)
            .in('cost_code_id', includedCostCodeIds);

          if (existingErr) throw existingErr;

          // Build upsert payload - no need for IDs, we'll use (project_id, cost_code_id) for conflict resolution
          const childBudgetItems = subcategories
            .filter(sub => selections[sub.cost_codes.id] !== false)
            .map(sub => {
              const qty = Number.isFinite(parseFloat(String(sub.quantity))) 
                ? parseFloat(String(sub.quantity)) 
                : 1;
              const price = Number.isFinite(parseFloat(String(sub.unit_price))) 
                ? parseFloat(String(sub.unit_price)) 
                : 0;

              return {
                project_id: projectId,
                cost_code_id: sub.cost_codes.id,
                quantity: qty,
                unit_price: price,
              };
            });

          const { error: budgetError } = await supabase
            .from('project_budgets')
            .upsert(childBudgetItems, { 
              onConflict: 'project_id,cost_code_id'
            });

          if (budgetError) throw budgetError;
        }

        // 3. Update the source
        updateSource({
          budgetItemId: budgetItem.id,
          source: 'estimate',
        });

        // 4. Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['all-budget-subcategories', projectId] });
        queryClient.invalidateQueries({ queryKey: ['budget-subcategories', budgetItem.id] });
        queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });

        onClose();
      } catch (error: any) {
        console.error('Error saving estimate:', error);
        toast({
          title: "Error",
          description: error?.message || "Failed to save estimate selections",
          variant: "destructive",
        });
      }
    } else {
      updateSource({
        budgetItemId: budgetItem.id,
        source,
      });
      onClose();
    }
  };

  const calculateEstimateTotal = () => {
    return calculatedTotal;
  };

  const hasChanges = () => {
    const currentSource = budgetItem.budget_source || 'estimate';
    return currentSource !== activeTab;
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
          <TabsList className="justify-start">
            {hasSubcategories && <TabsTrigger value="estimate">Estimate</TabsTrigger>}
            <TabsTrigger value="vendor-bid">Vendor Bid</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          {/* Estimate Tab */}
          <TabsContent value="estimate" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="w-12 p-3"></th>
                        <th className="text-left p-3 text-sm font-medium">Cost Code</th>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-left p-3 text-sm font-medium">Unit Price</th>
                        <th className="text-center p-3 text-sm font-medium">Unit</th>
                        <th className="text-left p-3 text-sm font-medium">Quantity</th>
                        <th className="text-left p-3 text-sm font-medium">Total</th>
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
                                disabled={isLocked}
                                onCheckedChange={(checked) => !isLocked && toggleSubcategory(subcategory.cost_codes.id, checked as boolean)}
                              />
                            </td>
                            <td className="p-3 text-sm">{subcategory.cost_codes?.code}</td>
                            <td className="p-3 text-sm">{subcategory.cost_codes?.name}</td>
                            <td className="p-3 text-sm text-left">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="p-3 text-sm text-center">
                              {truncateUnit(subcategory.cost_codes?.unit_of_measure)}
                            </td>
                            <td className="p-3 text-sm text-left">
                              {editingQuantityId === subcategory.id && !isLocked ? (
                                <input
                                  type="number"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleQuantityBlur(subcategory)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, subcategory)}
                                  className="w-20 px-2 py-1 text-left border rounded"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className={isLocked ? "" : "cursor-text hover:bg-muted rounded px-2 py-1"}
                                  onClick={() => !isLocked && handleQuantityEdit(subcategory.id, quantity)}
                                >
                                  {quantity}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-left font-medium">
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
          </TabsContent>

          {/* Vendor Bid Tab */}
          <TabsContent value="vendor-bid" className="flex-1 overflow-auto mt-4">
            {availableBids.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No bids available for this cost code yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can still enter manual pricing in the budget table.
                  </p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-lg font-semibold">$0</span>
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
                        <th className="text-left p-3 text-sm font-medium">Vendor</th>
                        <th className="text-left p-3 text-sm font-medium">Proposal</th>
                        <th className="text-left p-3 text-sm font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                        {availableBids.map((bid) => {
                          const subtotal = bid.price || 0;
                          
                          return (
                            <tr 
                              key={bid.id}
                              className={`border-t ${isLocked ? '' : 'cursor-pointer'} ${
                                selectedBidId === bid.id ? 'bg-blue-50' : isLocked ? '' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => !isLocked && setSelectedBidId(bid.id)}
                            >
                              <td className="p-3">
                                <Checkbox
                                  checked={selectedBidId === bid.id}
                                  disabled={isLocked}
                                  onCheckedChange={(checked) => !isLocked && checked && setSelectedBidId(bid.id)}
                                />
                              </td>
                              <td className="p-3 text-sm">{costCode.code}</td>
                              <td className="p-3 text-sm">
                                {bid.companies?.company_name || 'Unknown Company'}
                              </td>
                              <td className="p-3 text-sm">
                                {bid.proposals && bid.proposals.length > 0 ? (
                                  <div className="flex items-center space-x-2">
                                    {bid.proposals.map((fileName, idx) => {
                                      const IconComponent = getFileIcon(fileName);
                                      const iconColorClass = getFileIconColor(fileName);
                                      return (
                                        <button
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openProposalFile(fileName);
                                          }}
                                          className={`${iconColorClass} transition-colors p-1 hover:scale-110`}
                                          title={`View ${fileName.split('.').pop()?.toUpperCase()} file - ${fileName}`}
                                        >
                                          <IconComponent className="h-4 w-4" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3 text-sm text-left font-medium">
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
                    {selectedBidId 
                      ? formatCurrency(availableBids.find(b => b.id === selectedBidId)?.price || 0)
                      : '$0'
                    }
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="w-12 p-3"></th>
                      <th className="text-left p-3 text-sm font-medium">Cost Code</th>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-left p-3 text-sm font-medium">Unit Price</th>
                      <th className="text-center p-3 text-sm font-medium">Unit</th>
                      <th className="text-left p-3 text-sm font-medium">Quantity</th>
                      <th className="text-left p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3"></td>
                      <td className="p-3 text-sm">{costCode.code}</td>
                      <td className="p-3 text-sm">{costCode.name}</td>
                      <td className="p-3 text-sm text-left">
                        <Input
                          type="number"
                          value={manualUnitPriceInput}
                          onChange={(e) => setManualUnitPriceInput(e.target.value)}
                          className="w-28 h-8 text-left"
                          disabled={isLocked}
                          readOnly={isLocked}
                        />
                      </td>
                      <td className="p-3 text-sm text-center">
                        {truncateUnit(costCode.unit_of_measure)}
                      </td>
                      <td className="p-3 text-sm text-left">
                        <Input
                          type="number"
                          value={manualQuantityInput}
                          onChange={(e) => setManualQuantityInput(e.target.value)}
                          className="w-28 h-8 text-left"
                          disabled={isLocked}
                          readOnly={isLocked}
                        />
                      </td>
                      <td className="p-3 text-sm text-left font-medium">
                        {formatCurrency((parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm font-medium">Total Budget:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency((parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0))}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {isLocked ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={isLocked || isUpdating || isBidLoading}
          >
            {isUpdating || isBidLoading ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
