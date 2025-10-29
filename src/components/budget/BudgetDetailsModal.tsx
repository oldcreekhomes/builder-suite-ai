import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import { useBudgetBidSelection } from "@/hooks/useBudgetBidSelection";
import { useBudgetSourceUpdate } from "@/hooks/useBudgetSourceUpdate";
import { useHistoricalProjects } from "@/hooks/useHistoricalProjects";
import { useHistoricalActualCosts } from "@/hooks/useHistoricalActualCosts";
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
  
  // Determine initial tab based on budget_source
  const getInitialTab = () => {
    if (budgetItem.budget_source) {
      return budgetItem.budget_source === 'vendor-bid' ? 'vendor-bid' : budgetItem.budget_source;
    }
    return 'estimate';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  
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
  const { availableBids, selectBid, isLoading: isBidLoading } = useBudgetBidSelection(projectId, costCode.id);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(currentSelectedBidId || null);

  // Manual tab state
  const [manualQuantity, setManualQuantity] = useState<number>(budgetItem.quantity || 0);
  const [manualUnitPrice, setManualUnitPrice] = useState<number>(budgetItem.unit_price || 0);

  // Historical tab state
  const { data: historicalProjects = [] } = useHistoricalProjects();
  const [selectedHistoricalProjectId, setSelectedHistoricalProjectId] = useState<string | null>(
    budgetItem.historical_project_id || null
  );
  const { data: historicalCosts } = useHistoricalActualCosts(selectedHistoricalProjectId);

  // Budget source update hook
  const { updateSource, isUpdating } = useBudgetSourceUpdate(projectId);

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

  const handleApply = () => {
    const source = activeTab as 'estimate' | 'vendor-bid' | 'manual' | 'historical' | 'settings';
    
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
    } else if (source === 'historical') {
      updateSource({
        budgetItemId: budgetItem.id,
        source: 'historical',
        historicalProjectId: selectedHistoricalProjectId,
      });
      onClose();
    } else if (source === 'manual') {
      updateSource({
        budgetItemId: budgetItem.id,
        source: 'manual',
        manualQuantity,
        manualUnitPrice,
      });
      onClose();
    } else {
      updateSource({
        budgetItemId: budgetItem.id,
        source,
      });
      onClose();
    }
  };

  const calculateEstimateTotal = () => {
    if (!hasSubcategories || subcategories.length === 0) {
      const quantity = parseFloat(budgetItem.quantity?.toString() || '0');
      const unitPrice = parseFloat(budgetItem.unit_price?.toString() || '0');
      return quantity * unitPrice;
    }

    return calculatedTotal;
  };

  const getHistoricalCost = () => {
    if (!historicalCosts || !costCode.code) return 0;
    return historicalCosts.mapByCode[costCode.code] || 0;
  };

  const getSettingsPrice = () => {
    if (!costCode.price) return 0;
    return costCode.price * (budgetItem.quantity || 1);
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
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="vendor-bid">Vendor Bid</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Estimate Tab */}
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
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                        <th className="text-center p-3 text-sm font-medium">Unit</th>
                        <th className="text-right p-3 text-sm font-medium">Quantity</th>
                        <th className="text-right p-3 text-sm font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <RadioGroup value={selectedBidId || ''} onValueChange={setSelectedBidId}>
                        {availableBids.map((bid) => {
                          const quantity = budgetItem.quantity || 1;
                          const subtotal = (bid.price || 0) * quantity;
                          
                          return (
                            <tr 
                              key={bid.id}
                              className={`border-t cursor-pointer ${
                                selectedBidId === bid.id ? 'bg-blue-50' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setSelectedBidId(bid.id)}
                            >
                              <td className="p-3">
                                <RadioGroupItem value={bid.id} id={bid.id} />
                              </td>
                              <td className="p-3 text-sm">{costCode.code}</td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{bid.companies?.company_name || 'Unknown Company'}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getStatusColor(bid.packageStatus || 'pending')}`}
                                  >
                                    {bid.packageStatus || 'Pending'}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-3 text-sm text-right">
                                {formatCurrency(bid.price)}
                              </td>
                              <td className="p-3 text-sm text-center">
                                {truncateUnit(costCode.unit_of_measure)}
                              </td>
                              <td className="p-3 text-sm text-right">
                                {quantity}
                              </td>
                              <td className="p-3 text-sm text-right font-medium">
                                {formatCurrency(subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </RadioGroup>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-lg font-semibold">
                    {selectedBidId 
                      ? formatCurrency((availableBids.find(b => b.id === selectedBidId)?.price || 0) * (budgetItem.quantity || 1))
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
                        <Input
                          type="number"
                          value={manualUnitPrice}
                          onChange={(e) => setManualUnitPrice(parseFloat(e.target.value) || 0)}
                          className="w-28 h-8 text-right"
                        />
                      </td>
                      <td className="p-3 text-sm text-center">
                        {truncateUnit(costCode.unit_of_measure)}
                      </td>
                      <td className="p-3 text-sm text-right">
                        <Input
                          type="number"
                          value={manualQuantity}
                          onChange={(e) => setManualQuantity(parseFloat(e.target.value) || 0)}
                          className="w-28 h-8 text-right"
                        />
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(manualQuantity * manualUnitPrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm font-medium">Total Budget:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(manualQuantity * manualUnitPrice)}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Historical Tab */}
          <TabsContent value="historical" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="historical-project">Select Historical Project</Label>
                <Select
                  value={selectedHistoricalProjectId || ''}
                  onValueChange={setSelectedHistoricalProjectId}
                >
                  <SelectTrigger id="historical-project" className="mt-1.5">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {historicalProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedHistoricalProjectId && (
                <>
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
                            {getHistoricalCost() > 0 && budgetItem.quantity
                              ? formatCurrency(getHistoricalCost() / budgetItem.quantity)
                              : '$0'
                            }
                          </td>
                          <td className="p-3 text-sm text-center">
                            {truncateUnit(costCode.unit_of_measure)}
                          </td>
                          <td className="p-3 text-sm text-right">
                            {budgetItem.quantity || 0}
                          </td>
                          <td className="p-3 text-sm text-right font-medium">
                            {formatCurrency(getHistoricalCost())}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {getHistoricalCost() === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No historical data available for this cost code
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm font-medium">Total Budget:</span>
                <span className="text-lg font-semibold">
                  {selectedHistoricalProjectId ? formatCurrency(getHistoricalCost()) : '$0'}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-auto mt-4">
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
                        {formatCurrency(costCode.price)}
                      </td>
                      <td className="p-3 text-sm text-center">
                        {truncateUnit(costCode.unit_of_measure)}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {budgetItem.quantity || 0}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(getSettingsPrice())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {!costCode.price && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  No default price set in settings for this cost code
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-sm font-medium">Total Budget:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(getSettingsPrice())}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={isUpdating || isBidLoading || !hasChanges()}
          >
            {isUpdating || isBidLoading ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
