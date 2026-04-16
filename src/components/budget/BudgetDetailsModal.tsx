import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { useBudgetSubcategories } from "@/hooks/useBudgetSubcategories";
import { useBudgetBidSelection } from "@/hooks/useBudgetBidSelection";
import { useBudgetSourceUpdate } from "@/hooks/useBudgetSourceUpdate";
import { useHistoricalProjects, parseHistoricalKey } from "@/hooks/useHistoricalProjects";
import { useHistoricalActualCosts } from "@/hooks/useHistoricalActualCosts";
import { BudgetDetailsPurchaseOrderTab } from "@/components/budget/BudgetDetailsPurchaseOrderTab";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  lotCount?: number;
}

export function BudgetDetailsModal({
  isOpen,
  onClose,
  budgetItem,
  projectId,
  currentSelectedBidId,
  onBidSelected,
  isLocked = false,
  lotCount = 1,
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
  
  // Historical tab state and hooks
  const { data: historicalProjects = [] } = useHistoricalProjects();
  const [selectedHistoricalProjectId, setSelectedHistoricalProjectId] = useState<string | null>(() => {
    if (budgetItem.budget_source !== 'historical') return null;
    const pid = (budgetItem as any).historical_project_id;
    const lid = (budgetItem as any).historical_lot_id;
    if (!pid) return null;
    return lid ? `${pid}::${lid}` : pid;
  });
  const parsedHistorical = selectedHistoricalProjectId ? parseHistoricalKey(selectedHistoricalProjectId) : null;
  const { data: historicalCosts } = useHistoricalActualCosts(parsedHistorical?.projectId || null, parsedHistorical?.lotId);

  // PO tab - query PO count/total for this cost code
  const { data: poData } = useQuery({
    queryKey: ['budget-purchase-orders-summary', projectId, costCode.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select('id, total_amount')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCode.id)
        .eq('status', 'approved');
      if (error) throw error;
      const total = (data || []).reduce((sum, po) => sum + (po.total_amount || 0), 0);
      return { count: data?.length || 0, total };
    },
    enabled: !!projectId && !!costCode.id,
  });

  // Actual tab - query real costs from journal entry lines (mirrors Job Costs logic)
  const { data: actualCostData, isLoading: isActualLoading } = useQuery({
    queryKey: ['budget-actual-costs', projectId, costCode.id, budgetItem.lot_id],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .single();

      if (!settings?.wip_account_id) return { lines: [], total: 0 };

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit, memo,
          journal_entries!inner(entry_date, description, reversed_by_id)
        `)
        .eq('account_id', settings.wip_account_id)
        .eq('project_id', projectId)
        .eq('cost_code_id', costCode.id)
        .eq('is_reversal', false)
        .is('journal_entries.reversed_by_id', null);

      if (budgetItem.lot_id) {
        query = query.eq('lot_id', budgetItem.lot_id);
      }

      const { data: lines } = await query;

      const total = (lines || []).reduce((sum, l) => sum + ((l.debit || 0) - (l.credit || 0)), 0);
      return { lines: lines || [], total };
    },
    enabled: !!projectId && !!costCode.id && isOpen,
  });

  // Determine initial tab based on budget_source
  const getInitialTab = () => {
    if (budgetItem.budget_source) {
      const source = budgetItem.budget_source;
      if (source === 'actual' || source === 'vendor-bid' || source === 'manual' || source === 'purchase-orders' || source === 'historical') {
        return source;
      }
      if (source === 'estimate') {
        return 'estimate';
      }
    }
    return 'estimate';
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
  const [allocationMode, setAllocationMode] = useState<'full' | 'per-lot'>('full');
  const [manualAllocationMode, setManualAllocationMode] = useState<'full' | 'per-lot'>('full');
  const [poAllocationMode, setPoAllocationMode] = useState<'full' | 'per-lot'>('full');
  const [poAllocationAmount, setPoAllocationAmount] = useState<number>(0);

  // Budget source update hook
  const { updateSource, isUpdating } = useBudgetSourceUpdate(projectId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Infer allocation mode from saved data when dialog opens
  useEffect(() => {
    const isNear = (a: number, b: number, epsilon = 0.02) => Math.abs(a - b) < epsilon;

    if (lotCount > 1 && selectedBidId && budgetItem.unit_price > 0 && availableBids.length > 0) {
      const matchingBid = availableBids.find(b => b.id === selectedBidId);
      if (matchingBid) {
        const bidTotal = matchingBid.price;
        const basePerLot = Math.floor((bidTotal / lotCount) * 100) / 100;
        const remainderPerLot = Number((bidTotal - basePerLot * (lotCount - 1)).toFixed(2));
        const savedPrice = budgetItem.unit_price;

        if (isNear(savedPrice, basePerLot) || isNear(savedPrice, remainderPerLot)) {
          setAllocationMode('per-lot');
        } else {
          setAllocationMode('full');
        }
      }
    }
  }, [lotCount, selectedBidId, budgetItem.unit_price, availableBids]);

  // Infer manual allocation mode by summing all sibling lot rows
  const { data: siblingRows } = useQuery({
    queryKey: ['budget-siblings-manual', projectId, costCode.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('id, lot_id, unit_price, quantity')
        .eq('project_id', projectId)
        .eq('cost_code_id', costCode.id);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && lotCount > 1 && budgetItem.budget_source === 'manual',
  });

  useEffect(() => {
    if (lotCount <= 1 || budgetItem.budget_source !== 'manual' || !siblingRows || siblingRows.length === 0) return;

    const isNear = (a: number, b: number, epsilon = 0.02) => Math.abs(a - b) < epsilon;

    // Sum all sibling row totals with cent-precise math
    const reconstructedTotal = siblingRows.reduce((sum, row) => {
      return sum + Math.round(((row.unit_price || 0) * (row.quantity || 1)) * 100);
    }, 0) / 100;

    if (reconstructedTotal <= 0) return;

    // Compute expected split pattern
    const basePerLot = Math.floor((reconstructedTotal / lotCount) * 100) / 100;
    const remainderPerLot = Number((reconstructedTotal - basePerLot * (lotCount - 1)).toFixed(2));

    // Check if all sibling rows match the split pattern
    const allMatch = siblingRows.every(row => {
      const rowTotal = Math.round(((row.unit_price || 0) * (row.quantity || 1)) * 100) / 100;
      return isNear(rowTotal, basePerLot) || isNear(rowTotal, remainderPerLot);
    });

    if (allMatch && siblingRows.length === lotCount) {
      setManualAllocationMode('per-lot');
      setManualUnitPriceInput(reconstructedTotal.toString());
      setManualQuantityInput('1');
    }
  }, [lotCount, budgetItem.budget_source, siblingRows]);

  useEffect(() => {
    setSelectedBidId(currentSelectedBidId || null);
  }, [currentSelectedBidId]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [budgetItem.budget_source]);

  // Reset historical project selection when dialog opens
  useEffect(() => {
    if (isOpen && budgetItem.budget_source === 'historical') {
      setSelectedHistoricalProjectId((budgetItem as any).historical_project_id || null);
    }
  }, [isOpen, budgetItem.budget_source]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0.00';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const truncateUnit = (unit: string | null | undefined) => {
    if (!unit) return '';
    const unitMap: Record<string, string> = {
      'square-feet': 'SF', 'linear-feet': 'LF', 'cubic-yard': 'CY',
      'square-yard': 'SY', 'lump-sum': 'LS', 'each': 'EA', 'hour': 'HR', 'month': 'MO'
    };
    return unitMap[unit] || unit;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  // Per-lot calculation
  const selectedBidPrice = selectedBidId ? (availableBids.find(b => b.id === selectedBidId)?.price || 0) : 0;
  const hasMultipleLots = lotCount > 1;
  const perLotAmount = hasMultipleLots && selectedBidPrice > 0
    ? Math.floor((selectedBidPrice / lotCount) * 100) / 100
    : selectedBidPrice;
  const displayAmount = hasMultipleLots && allocationMode === 'per-lot' ? perLotAmount : selectedBidPrice;

  // Historical cost for current cost code
  const historicalCostForCode = historicalCosts?.mapByCode[costCode.code] || 0;

  const handleApply = async () => {
    if (isLocked) return;
    
    if (activeTab === 'actual') {
      onClose();
      return;
    }
    
    const source = activeTab as 'estimate' | 'vendor-bid' | 'manual' | 'purchase-orders' | 'historical';
    
    if (source === 'vendor-bid') {
      const shouldDivide = hasMultipleLots && allocationMode === 'per-lot';
      selectBid(
        { 
          budgetItemId: budgetItem.id, 
          bidId: selectedBidId, 
          allocationMode: shouldDivide ? 'per-lot' : 'full',
          lotCount: shouldDivide ? lotCount : undefined, 
          bidTotal: selectedBidPrice || undefined,
        },
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
      const manualQty = parseFloat(manualQuantityInput) || 0;
      const manualPrice = parseFloat(manualUnitPriceInput) || 0;
      const shouldDivide = hasMultipleLots && manualAllocationMode === 'per-lot';

      if (shouldDivide && lotCount > 1) {
        const total = manualQty * manualPrice;
        const perLot = Math.floor((total / lotCount) * 100) / 100;
        const lastLotAmount = Number((total - perLot * (lotCount - 1)).toFixed(2));

        try {
          const { data: allBudgetItems, error: allError } = await supabase
            .from('project_budgets')
            .select('id, lot_id')
            .eq('project_id', projectId)
            .eq('cost_code_id', costCode.id)
            .order('lot_id', { ascending: true });

          if (allError) throw allError;

          if (allBudgetItems && allBudgetItems.length > 0) {
            for (let i = 0; i < allBudgetItems.length; i++) {
              const amount = i === allBudgetItems.length - 1 ? lastLotAmount : perLot;
              const { error: updateError } = await supabase
                .from('project_budgets')
                .update({ unit_price: amount, quantity: 1, budget_source: 'manual' })
                .eq('id', allBudgetItems[i].id);
              if (updateError) throw updateError;
            }
          }

          queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
          queryClient.invalidateQueries({ queryKey: ['job-costs'] });
          toast({ title: "Budget source updated", description: `Now using Manual for this budget item` });
        } catch (error: any) {
          console.error('Error saving manual per-lot:', error);
          toast({ title: "Error", description: error?.message || "Failed to save manual allocation", variant: "destructive" });
        }
      } else {
        updateSource({
          budgetItemId: budgetItem.id,
          source: 'manual',
          manualQuantity: manualQty,
          manualUnitPrice: manualPrice,
        });
      }
      onClose();
    } else if (source === 'purchase-orders') {
      const shouldDivide = hasMultipleLots && poAllocationMode === 'per-lot';
      updateSource({
        budgetItemId: budgetItem.id,
        source: 'purchase-orders',
        manualQuantity: 1,
        manualUnitPrice: shouldDivide ? poAllocationAmount : (poData?.total || 0),
      });
      onClose();
    } else if (source === 'historical') {
      if (selectedHistoricalProjectId && historicalCostForCode > 0) {
        const parsed = parseHistoricalKey(selectedHistoricalProjectId);
        updateSource({
          budgetItemId: budgetItem.id,
          source: 'historical',
          historicalProjectId: parsed.projectId,
          historicalLotId: parsed.lotId,
          manualUnitPrice: historicalCostForCode,
          manualQuantity: 1,
        });
      }
      onClose();
    } else if (source === 'estimate') {
      try {
        const selectionsToUpsert = subcategories.map(sub => ({
          project_budget_id: budgetItem.id,
          cost_code_id: sub.cost_codes.id,
          included: selections[sub.cost_codes.id] !== false,
        }));

        const { error: selectionsError } = await supabase
          .from('budget_subcategory_selections')
          .upsert(selectionsToUpsert, { onConflict: 'project_budget_id,cost_code_id' });

        if (selectionsError) throw selectionsError;

        const includedCostCodeIds = subcategories
          .filter(sub => selections[sub.cost_codes.id] !== false)
          .map(sub => sub.cost_codes.id);

        if (includedCostCodeIds.length > 0) {
          const { data: existingRows, error: existingErr } = await supabase
            .from('project_budgets')
            .select('id, cost_code_id')
            .eq('project_id', projectId)
            .in('cost_code_id', includedCostCodeIds);

          if (existingErr) throw existingErr;

          const childBudgetItems = subcategories
            .filter(sub => selections[sub.cost_codes.id] !== false)
            .map(sub => {
              const qty = Number.isFinite(parseFloat(String(sub.quantity))) ? parseFloat(String(sub.quantity)) : 1;
              const price = Number.isFinite(parseFloat(String(sub.unit_price))) ? parseFloat(String(sub.unit_price)) : 0;
              return { project_id: projectId, cost_code_id: sub.cost_codes.id, quantity: qty, unit_price: price };
            });

          const { error: budgetError } = await supabase
            .from('project_budgets')
            .upsert(childBudgetItems, { onConflict: 'project_id,cost_code_id' });

          if (budgetError) throw budgetError;
        }

        updateSource({ budgetItemId: budgetItem.id, source: 'estimate' });

        queryClient.invalidateQueries({ queryKey: ['all-budget-subcategories', projectId] });
        queryClient.invalidateQueries({ queryKey: ['budget-subcategories', budgetItem.id] });
        queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
        queryClient.invalidateQueries({ queryKey: ['job-costs'] });

        onClose();
      } catch (error: any) {
        console.error('Error saving estimate:', error);
        toast({ title: "Error", description: error?.message || "Failed to save estimate selections", variant: "destructive" });
      }
    } else {
      updateSource({ budgetItemId: budgetItem.id, source });
      onClose();
    }
  };

  const calculateEstimateTotal = () => calculatedTotal;

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
            <TabsTrigger value="actual">Actual</TabsTrigger>
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="historical">Historical</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="vendor-bid">Vendor Bid</TabsTrigger>
          </TabsList>

          {/* Actual Tab */}
          <TabsContent value="actual" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isActualLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                          Loading costs...
                        </TableCell>
                      </TableRow>
                    ) : !actualCostData?.lines?.length ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                          No costs to date
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...actualCostData.lines]
                        .sort((a, b) => {
                          const dateA = (a.journal_entries as any)?.entry_date || '';
                          const dateB = (b.journal_entries as any)?.entry_date || '';
                          return dateA.localeCompare(dateB);
                        })
                        .map((line, idx) => {
                          const je = line.journal_entries as any;
                          const amount = (line.debit || 0) - (line.credit || 0);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="text-sm">
                                {je?.entry_date ? format(new Date(je.entry_date + 'T00:00:00'), 'MM/dd/yyyy') : '—'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {line.memo || je?.description || '—'}
                              </TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                {formatCurrency(amount)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Total Actual:</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(actualCostData?.total || 0)}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Estimate Tab */}
          <TabsContent value="estimate" className="flex-1 overflow-auto mt-4">
            {!hasSubcategories ? (
              <div className="space-y-4">
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No estimate subcategories available for this cost code.
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-sm font-semibold">$0.00</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Cost Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-center">Unit</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subcategories.map((subcategory) => {
                        const isSelected = selections[subcategory.cost_codes.id] !== false;
                        const quantity = parseFloat(subcategory.quantity?.toString() || '0');
                        const unitPrice = parseFloat(subcategory.unit_price?.toString() || '0');
                        const subtotal = quantity * unitPrice;

                        return (
                          <TableRow 
                            key={subcategory.id} 
                            className={isSelected ? 'bg-muted' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                disabled={isLocked}
                                onCheckedChange={(checked) => !isLocked && toggleSubcategory(subcategory.cost_codes.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="text-sm">{subcategory.cost_codes?.code}</TableCell>
                            <TableCell className="text-sm">{subcategory.cost_codes?.name}</TableCell>
                            <TableCell className="text-sm">
                              {formatCurrency(unitPrice)}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              {truncateUnit(subcategory.cost_codes?.unit_of_measure)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {editingQuantityId === subcategory.id && !isLocked ? (
                                <Input
                                  type="number"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleQuantityBlur(subcategory)}
                                  onKeyDown={(e) => handleQuantityKeyDown(e, subcategory)}
                                  className="w-20 h-8"
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
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {formatCurrency(subtotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-sm font-semibold">
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
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No bids available for this cost code yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can still enter manual pricing in the budget table.
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total Budget:</span>
                  <span className="text-sm font-semibold">$0.00</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Cost Code</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Proposal</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableBids.map((bid) => {
                        const subtotal = bid.price || 0;
                        
                        return (
                          <TableRow 
                            key={bid.id}
                            className={`${isLocked ? '' : 'cursor-pointer'} ${
                              selectedBidId === bid.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => !isLocked && setSelectedBidId(bid.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedBidId === bid.id}
                                disabled={isLocked}
                                onCheckedChange={(checked) => !isLocked && checked && setSelectedBidId(bid.id)}
                              />
                            </TableCell>
                            <TableCell className="text-sm">{costCode.code}</TableCell>
                            <TableCell className="text-sm">
                              {bid.companies?.company_name || 'Unknown Company'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {bid.proposals && bid.proposals.length > 0 ? (
                                <div className="flex items-center space-x-2">
                                  {bid.proposals.map((fileName, idx) => {
                                    const IconComponent = getFileIcon(fileName);
                                    const iconColorClass = getFileIconColor(fileName);
                                    return (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openProposalFile(fileName);
                                            }}
                                            className={`${iconColorClass} transition-colors p-1 hover:scale-110`}
                                          >
                                            <IconComponent className="h-4 w-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View {fileName.split('.').pop()?.toUpperCase()} file - {fileName}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {formatCurrency(subtotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Allocation Mode Toggle */}
                {hasMultipleLots && selectedBidId && selectedBidPrice > 0 && (
                  <div className="border rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="text-sm font-medium">Allocation Mode</div>
                    <RadioGroup
                      value={allocationMode}
                      onValueChange={(val) => setAllocationMode(val as 'full' | 'per-lot')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label htmlFor="alloc-full" className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${allocationMode === 'full' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="full" id="alloc-full" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">Full amount</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(selectedBidPrice)}</div>
                        </div>
                      </label>
                      <label htmlFor="alloc-per-lot" className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${allocationMode === 'per-lot' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="per-lot" id="alloc-per-lot" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">Divide by {lotCount} lots</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(selectedBidPrice)} ÷ {lotCount} = {formatCurrency(perLotAmount)}/lot</div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">
                    {hasMultipleLots && selectedBidId && allocationMode === 'per-lot' ? 'Total Budget (per lot):' : 'Total Budget:'}
                  </span>
                  <span className="text-sm font-semibold">
                    {selectedBidId 
                      ? formatCurrency(displayAmount)
                      : '$0.00'
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Cost Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-center">Unit</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell className="text-sm">{costCode.code}</TableCell>
                      <TableCell className="text-sm">{costCode.name}</TableCell>
                      <TableCell className="text-sm">
                        <Input
                          type="number"
                          value={manualUnitPriceInput}
                          onChange={(e) => setManualUnitPriceInput(e.target.value)}
                          className="w-28 h-8"
                          disabled={isLocked}
                          readOnly={isLocked}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {truncateUnit(costCode.unit_of_measure)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Input
                          type="number"
                          value={manualQuantityInput}
                          onChange={(e) => setManualQuantityInput(e.target.value)}
                          className="w-28 h-8"
                          disabled={isLocked}
                          readOnly={isLocked}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency((parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {/* Manual Allocation Mode Toggle */}
              {hasMultipleLots && ((parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0)) > 0 && (
                (() => {
                  const manualTotal = (parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0);
                  const manualPerLot = Math.floor((manualTotal / lotCount) * 100) / 100;
                  return (
                    <div className="border rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="text-sm font-medium">Allocation Mode</div>
                      <RadioGroup
                        value={manualAllocationMode}
                        onValueChange={(val) => setManualAllocationMode(val as 'full' | 'per-lot')}
                        className="grid grid-cols-2 gap-3"
                      >
                        <label htmlFor="manual-alloc-full" className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${manualAllocationMode === 'full' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <RadioGroupItem value="full" id="manual-alloc-full" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">Full amount</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(manualTotal)}</div>
                          </div>
                        </label>
                        <label htmlFor="manual-alloc-per-lot" className={`flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${manualAllocationMode === 'per-lot' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <RadioGroupItem value="per-lot" id="manual-alloc-per-lot" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">Divide by {lotCount} lots</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(manualTotal)} ÷ {lotCount} = {formatCurrency(manualPerLot)}/lot</div>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>
                  );
                })()
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">
                  {hasMultipleLots && manualAllocationMode === 'per-lot' ? 'Total Budget (per lot):' : 'Total Budget:'}
                </span>
                <span className="text-sm font-semibold">
                  {(() => {
                    const manualTotal = (parseFloat(manualQuantityInput) || 0) * (parseFloat(manualUnitPriceInput) || 0);
                    if (hasMultipleLots && manualAllocationMode === 'per-lot' && manualTotal > 0) {
                      return formatCurrency(Math.floor((manualTotal / lotCount) * 100) / 100);
                    }
                    return formatCurrency(manualTotal);
                  })()}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="flex-1 overflow-auto mt-4">
            <BudgetDetailsPurchaseOrderTab 
              projectId={projectId} 
              costCodeId={costCode.id} 
              lotCount={lotCount}
              isLocked={isLocked}
              budgetItemUnitPrice={budgetItem.unit_price}
              onAllocationChange={(mode, amount) => {
                setPoAllocationMode(mode);
                setPoAllocationAmount(amount);
              }}
            />
          </TabsContent>

          {/* Historical Tab */}
          <TabsContent value="historical" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              {historicalProjects.length === 0 ? (
                <>
                  <div className="text-center py-6 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No historical projects with actual costs available.
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Total Budget:</span>
                    <span className="text-sm font-semibold">$0.00</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Select a Historical Project</Label>
                      <Select
                        value={selectedHistoricalProjectId || ''}
                        onValueChange={(val) => setSelectedHistoricalProjectId(val || null)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Choose a project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {historicalProjects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedHistoricalProjectId && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cost Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Actual Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-sm">{costCode.code}</TableCell>
                              <TableCell className="text-sm">{costCode.name}</TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                {historicalCostForCode > 0 
                                  ? formatCurrency(historicalCostForCode) 
                                  : <span className="text-muted-foreground">No data</span>
                                }
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Total Budget:</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(historicalCostForCode)}
                    </span>
                  </div>
                </>
              )}
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
