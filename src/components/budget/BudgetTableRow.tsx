import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Lock, Unlock } from 'lucide-react';
import { BudgetDetailsModal } from './BudgetDetailsModal';
import { BudgetTableRowActions } from './components/BudgetTableRowActions';
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
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
      <TableCell className="px-1 py-0 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          tabIndex={-1}
          className="h-3 w-3"
        />
      </TableCell>
      <TableCell className="px-1 py-0 w-20" style={{ paddingLeft: '24px' }}>
        <div className="text-xs font-medium">
          {costCode?.code}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-40">
        <div className="text-xs">
          {costCode?.name}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={visibleColumns.cost ? '' : 'opacity-0 pointer-events-none select-none'}>
          {hasSelectedBid ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-black">
                ${Math.round(bidPrice).toLocaleString()}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1 py-0 cursor-help">
                      BID
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{bidCompanyName}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (hasSubcategories && !manualOverrideEnabled && !hasManualValues) ? (
            <span className="rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap">
              ${Math.round(displayUnitPrice).toLocaleString()}
            </span>
          ) : isEditingPrice ? (
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              onBlur={handleUnitPriceBlur}
              onKeyDown={handleUnitPriceKeyDown}
              className="bg-transparent border-none outline-none text-xs w-full p-0 focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ caretColor: "black", fontSize: "inherit", fontFamily: "inherit" }}
              autoFocus
            />
          ) : (
            <span 
              className="cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap"
              onClick={handlePriceClick}
            >
              ${Math.round(displayUnitPrice).toLocaleString()}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-20">
        <div className={visibleColumns.unit ? '' : 'opacity-0 pointer-events-none select-none'}>
          {hasSelectedBid ? (
            <span className="rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap">
              N/A
            </span>
          ) : (hasSubcategories && !manualOverrideEnabled && !hasManualValues) ? (
            <span className="rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap">
            {selectedCount === 1 && singleSelectedSubcategory
              ? formatUnitOfMeasure(
                  singleSelectedSubcategory.cost_codes?.unit_of_measure || costCode?.unit_of_measure
                )
              : "N/A"}
            </span>
          ) : isEditingUnit ? (
            <Select
              defaultOpen
              value={tempUnit || costCode?.unit_of_measure || ''}
              onValueChange={(value) => {
                setTempUnit(value);
                onUpdateUnit(costCode.id, value);
                setIsEditingUnit(false);
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setIsEditingUnit(false);
                }
              }}
            >
              <SelectTrigger className="h-6 w-20 text-xs border-none shadow-none focus:ring-0 p-0 px-1 [&>svg]:hidden">
                <span className="text-xs">
                  {formatUnitOfMeasure(tempUnit || costCode?.unit_of_measure)}
                </span>
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="cubic-yard">Cubic Yard</SelectItem>
                <SelectItem value="each">Each</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="linear-feet">Linear Feet</SelectItem>
                <SelectItem value="lump-sum">Lump Sum</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="square-feet">Square Feet</SelectItem>
                <SelectItem value="square-yard">Square Yard</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span 
              className="cursor-pointer hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap"
              onClick={handleUnitClick}
            >
              {formatUnitOfMeasure(costCode?.unit_of_measure)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-24">
        <div className={visibleColumns.quantity ? '' : 'opacity-0 pointer-events-none select-none'}>
          {hasSelectedBid ? (
            <span className="rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap">
              N/A
            </span>
          ) : (hasSubcategories && !manualOverrideEnabled && !hasManualValues) ? (
            <span className="rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap">
              {selectedCount === 1 && singleSelectedSubcategory
                ? (singleSelectedSubcategory.quantity || 0)
                : "N/A"}
            </span>
          ) : isEditingQuantity ? (
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={handleQuantityBlur}
              onKeyDown={handleQuantityKeyDown}
              className="bg-transparent border-none outline-none text-xs w-full p-0 focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ caretColor: "black", fontSize: "inherit", fontFamily: "inherit" }}
              autoFocus
            />
          ) : (
            <span 
              className="cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap"
              onClick={handleQuantityClick}
            >
              {parseFloat(quantity) || 0}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs ${visibleColumns.totalBudget ? '' : 'opacity-0 select-none'}`}>
          {formatCurrency(total)}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-48">
        <div className={`text-xs -ml-3 ${visibleColumns.historicalCosts ? '' : 'opacity-0 select-none pointer-events-none'}`}>
          {historicalActual !== null ? formatCurrency(historicalActual) : '-'}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs -ml-3 font-medium ${getVarianceColor(variance)} ${visibleColumns.variance ? '' : 'opacity-0 select-none'}`}>
          {formatVariance(variance)}
        </div>
      </TableCell>
      <BudgetTableRowActions
        item={item}
        costCode={costCode}
        onDelete={onDelete}
        onViewDetailsClick={() => setShowDetailsModal(true)}
        isDeleting={isDeleting}
        hasSelectedBid={hasSelectedBid}
      />
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
