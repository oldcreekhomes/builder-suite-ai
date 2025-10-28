import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Lock, Unlock } from 'lucide-react';
import { BudgetDetailsModal } from './BudgetDetailsModal';
import { BudgetTableRowActions } from './components/BudgetTableRowActions';
import { BudgetSourceBadge } from './BudgetSourceBadge';
import { useBudgetSubcategories } from '@/hooks/useBudgetSubcategories';
import { calculateBudgetItemTotal } from '@/utils/budgetUtils';
import type { Tables } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';
import { Badge } from '@/components/ui/badge';
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
  visibleColumns
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
  
  // Use the shared calculation utility for consistency
  const total = calculateBudgetItemTotal(item, subcategoryTotal, manualOverrideEnabled);
  
  // For display purposes in Cost column
  const displayUnitPrice = hasSelectedBid 
    ? bidPrice 
    : (hasSubcategories && !manualOverrideEnabled && !hasManualValues) 
      ? subcategoryTotal 
      : parseFloat(unitPrice) || 0;
    
  const historicalActual = costCode?.code ? (historicalActualCosts[costCode.code] || null) : null;
  
  const calculateVariance = () => {
    // Only show no variance if BOTH are 0 or null
    if ((historicalActual === null || historicalActual === 0) && total === 0) return null;
    
    // Treat null historical as 0 for calculation
    const historical = historicalActual || 0;
    
    if (showVarianceAsPercentage && total !== 0) {
      return ((historical - total) / total) * 100;
    }
    return historical - total;
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

  return (
    <React.Fragment>
      <TableRow className={`h-12 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
      <TableCell className="h-12 px-3 py-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="h-12 px-3 py-2 text-sm font-medium w-32">
        {costCode?.code || '-'}
      </TableCell>
      <TableCell className="h-12 px-3 py-2 text-sm flex-1 min-w-[200px]" title={costCode?.name || '-'}>
        {costCode?.name || '-'}
      </TableCell>
      <TableCell className="h-12 px-3 py-2 w-40">
        <BudgetSourceBadge item={item} />
      </TableCell>
      <TableCell className="h-12 px-3 py-2 text-sm text-right font-semibold w-48">
        ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      {visibleColumns.historicalCosts && (
        <TableCell className="h-12 px-3 py-2 text-sm text-right w-48">
          {historicalActual !== null && historicalActual !== undefined 
            ? `$${historicalActual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'
          }
        </TableCell>
      )}
      {visibleColumns.variance && (
        <TableCell className="h-12 px-3 py-2 text-sm text-right font-medium w-40">
          {variance !== null && variance !== undefined ? (
            <span className={getVarianceColor(variance)}>
              {formatVariance(variance)}
            </span>
          ) : '-'}
        </TableCell>
      )}
      <TableCell className="h-12 px-3 py-2 sticky right-0 bg-background z-20 w-40">
        <BudgetTableRowActions
          item={item}
          costCode={costCode}
          onDelete={onDelete}
          onViewDetailsClick={() => setShowDetailsModal(true)}
          isDeleting={isDeleting}
          hasSelectedBid={hasSelectedBid}
        />
      </TableCell>
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
