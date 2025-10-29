import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { BudgetDetailsModal } from './BudgetDetailsModal';
import { BudgetSourceBadge } from './BudgetSourceBadge';
import { useBudgetSubcategories } from '@/hooks/useBudgetSubcategories';
import { useHistoricalActualCosts } from '@/hooks/useHistoricalActualCosts';
import { useBudgetWarnings } from '@/hooks/useBudgetWarnings';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import type { Tables } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CostCode = Tables<'cost_codes'>;

interface BudgetTableRowProps {
  item: any; // Project budget item with cost_codes relation
  onUpdate: (id: string, quantity: number, unit_price: number) => void;
  onUpdateUnit: (costCodeId: string, unit_of_measure: string) => void;
  onDelete: (itemId: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  historicalActualCosts?: Record<string, number>;
  showVarianceAsPercentage?: boolean;
  visibleColumns: VisibleColumns;
  projectId?: string;
  itemTotal?: number; // Pre-calculated total from itemTotalsMap
}

export function BudgetTableRow({ 
  item, 
  onUpdate, 
  onUpdateUnit,
  onDelete,
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange,
  isDeleting = false,
  historicalActualCosts = {},
  showVarianceAsPercentage = false,
  visibleColumns,
  projectId,
  itemTotal
}: BudgetTableRowProps) {
  const [quantity, setQuantity] = useState((item.quantity || 0).toString());
  const [unitPrice, setUnitPrice] = useState((item.unit_price || 0).toString());
  const [tempUnit, setTempUnit] = useState('');
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [manualOverrideEnabled, setManualOverrideEnabled] = useState(false);
  
  const costCode = item.cost_codes as CostCode;
  
  // Fetch historical costs if this item uses historical source
  const shouldFetchHistorical = item.budget_source === 'historical' && !!item.historical_project_id;
  const { data: historicalData } = useHistoricalActualCosts(
    shouldFetchHistorical ? item.historical_project_id : null
  );
  
  // Extract historical cost for this specific cost code
  const historicalCostForItem = shouldFetchHistorical && costCode?.code 
    ? (historicalData?.mapByCode[costCode.code] || 0)
    : undefined;
  
  // Use subcategories hook to get calculated total if cost code has subcategories
  const hasSubcategories = costCode?.has_subcategories || false;
  const { calculatedTotal: subcategoryTotal, selections, subcategories } = useBudgetSubcategories(
    item.id,
    costCode?.id,
    item.project_id,
    hasSubcategories
  );

  // Calculate selected subcategory info
  const selectedCount = Object.values(selections).filter(v => !!v).length;
  const singleSelectedSubcategory = selectedCount === 1 
    ? subcategories.find(sub => selections[sub.cost_codes.id])
    : null;
  
  // Check if manual values have been saved
  const hasManualValues = item.quantity !== null && item.quantity !== 0 && item.unit_price !== null && item.unit_price !== 0;
  
  // Get selected bid details
  const selectedBid = item.selected_bid as any;
  const hasSelectedBid = !!item.selected_bid_id && selectedBid;
  const bidPrice = hasSelectedBid ? (selectedBid.price || 0) : 0;
  const bidCompanyName = hasSelectedBid ? (selectedBid.companies?.company_name || 'Unknown') : '';
  
  // Use pre-calculated total if provided (from itemTotalsMap), otherwise calculate
  const total = itemTotal ?? calculateBudgetItemTotal(item, subcategoryTotal, manualOverrideEnabled, historicalCostForItem);
  
  // For display purposes in Cost column
  const displayUnitPrice = hasSelectedBid 
    ? bidPrice 
    : (hasSubcategories && !manualOverrideEnabled && !hasManualValues) 
      ? subcategoryTotal 
      : parseFloat(unitPrice) || 0;
    
  const historicalActual = costCode?.code ? (historicalActualCosts[costCode.code] || null) : null;
  
  const calculateVariance = () => {
    // Don't show variance if no historical data available
    if (historicalActual === null || historicalActual === undefined) return null;
    
    // Only show no variance if BOTH are 0
    if (historicalActual === 0 && total === 0) return null;
    
    if (showVarianceAsPercentage && total !== 0) {
      return ((historicalActual - total) / total) * 100;
    }
    return historicalActual - total;
  };
  
  const variance = calculateVariance();
  
  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return 'text-gray-400';
    if (variance > 0) return 'text-green-600'; // Budget under historical (good)
    if (variance < 0) return 'text-red-600'; // Budget over historical (warning)
    return 'text-gray-600'; // On budget
  };
  
  const formatVariance = (variance: number | null) => {
    if (variance === null) return '-';
    if (showVarianceAsPercentage) {
      return `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`;
    }
    return `${variance > 0 ? '+' : '-'}${formatCurrency(Math.abs(variance))}`;
  };

  const handleQuantityBlur = () => {
    const numQuantity = parseFloat(quantity) || 0;
    const numUnitPrice = parseFloat(unitPrice) || 0;
    
    // Only update if values have changed
    if (numQuantity !== (item.quantity || 0) || numUnitPrice !== (item.unit_price || 0)) {
      onUpdate(item.id, numQuantity, numUnitPrice);
    }
    setIsEditingQuantity(false);
  };

  const handleUnitPriceBlur = () => {
    const numQuantity = parseFloat(quantity) || 0;
    const numUnitPrice = parseFloat(unitPrice) || 0;
    
    // Only update if values have changed
    if (numQuantity !== (item.quantity || 0) || numUnitPrice !== (item.unit_price || 0)) {
      onUpdate(item.id, numQuantity, numUnitPrice);
    }
    setIsEditingPrice(false);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      handleQuantityBlur();
      // End of row - move to next row's price field would go here
    }
  };

  const handleUnitPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      handleUnitPriceBlur();
      // Move to Unit column
      setTimeout(() => {
        setIsEditingUnit(true);
      }, 50);
    }
  };

  const handleUnitBlur = () => {
    if (tempUnit.trim() && tempUnit !== costCode?.unit_of_measure) {
      onUpdateUnit(costCode.id, tempUnit.trim());
    }
    setIsEditingUnit(false);
  };

  const handleUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setIsEditingUnit(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleUnitBlur();
      if (!e.shiftKey) {
        setTimeout(() => {
          setIsEditingQuantity(true);
        }, 50);
      }
    }
  };

  const handlePriceClick = () => {
    setIsEditingPrice(true);
    setUnitPrice((item.unit_price || 0).toString());
  };

  const handleQuantityClick = () => {
    setIsEditingQuantity(true);
    setQuantity((item.quantity || 0).toString());
  };

  const handleUnitClick = () => {
    setIsEditingUnit(true);
    setTempUnit(costCode?.unit_of_measure || '');
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  // Get budget warnings
  const warnings = useBudgetWarnings(item, total, costCode);

  return (
    <React.Fragment>
      <TableRow 
        className={`h-10 hover:bg-muted/50 border-b cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
        onClick={() => setShowDetailsModal(true)}
      >
        <TableCell className="w-12 py-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="w-40 py-1 text-sm font-medium pl-12">
          {costCode?.code || '-'}
        </TableCell>
        <TableCell className="w-[320px] py-1 text-sm">
          {costCode?.name || '-'}
        </TableCell>
        <TableCell className="w-48 py-1 text-sm">
          <BudgetSourceBadge item={item} />
        </TableCell>
        <TableCell className="w-52 py-1 text-sm">
          {formatCurrency(total)}
        </TableCell>
        <TableCell className="w-32 py-1 text-center" onClick={(e) => e.stopPropagation()}>
          {warnings.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center cursor-help">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">Budget Warnings:</p>
                    {warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs">• {warning.message}</p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TableCell>
        {visibleColumns.historicalCosts && (
          <TableCell className="w-52 py-1 text-sm">
            {historicalActual !== null && historicalActual !== undefined 
              ? formatCurrency(historicalActual)
              : '-'
            }
          </TableCell>
        )}
        {visibleColumns.variance && (
          <TableCell className="w-48 py-1 text-sm">
            <span className={getVarianceColor(variance)}>
              {formatVariance(variance)}
            </span>
          </TableCell>
        )}
      </TableRow>
    
    {showDetailsModal && costCode && (
      <BudgetDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        budgetItem={item}
        projectId={item.project_id}
        currentSelectedBidId={item.selected_bid_id}
        onBidSelected={() => {
          setShowDetailsModal(false);
        }}
      />
    )}
    </React.Fragment>
  );
}
