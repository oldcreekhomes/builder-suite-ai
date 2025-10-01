import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { ViewBudgetDetailsModal } from './ViewBudgetDetailsModal';
import { useBudgetSubcategories } from '@/hooks/useBudgetSubcategories';
import type { Tables } from '@/integrations/supabase/types';
import { VisibleColumns } from './BudgetColumnVisibilityDropdown';

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
  
  const costCode = item.cost_codes as CostCode;
  
  // Use subcategories hook to get calculated total if cost code has subcategories
  const hasSubcategories = costCode?.has_subcategories || false;
  const { calculatedTotal: subcategoryTotal } = useBudgetSubcategories(
    item.id,
    costCode?.id,
    item.project_id,
    hasSubcategories
  );
  
  // Use subcategory total if available, otherwise calculate normally
  const total = hasSubcategories 
    ? subcategoryTotal 
    : (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  
  // For display purposes, show the unit price (Cost column)
  // If has subcategories, show the calculated total (which represents the aggregated cost)
  const displayUnitPrice = hasSubcategories ? subcategoryTotal : parseFloat(unitPrice) || 0;
    
  const historicalActual = historicalActualCosts[costCode?.id] || null;
  
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
    if (tempUnit.trim() && tempUnit !== formatUnitOfMeasure(costCode?.unit_of_measure)) {
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
    setTempUnit(formatUnitOfMeasure(costCode?.unit_of_measure) || '');
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  return (
    <>
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
      <TableCell className="px-1 py-0 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          tabIndex={-1}
          className="h-3 w-3"
        />
      </TableCell>
      <TableCell className="px-1 py-0 w-20" style={{ paddingLeft: '50px' }}>
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
          {!hasSubcategories && isEditingPrice ? (
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
              className={`${hasSubcategories ? '' : 'cursor-text hover:bg-muted'} rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap`}
              onClick={hasSubcategories ? undefined : handlePriceClick}
            >
              ${Math.round(displayUnitPrice).toLocaleString()}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-20">
        <div className={visibleColumns.unit ? '' : 'opacity-0 pointer-events-none select-none'}>
          {!hasSubcategories && isEditingUnit ? (
            <input
              type="text"
              value={tempUnit}
              onChange={(e) => setTempUnit(e.target.value.toUpperCase())}
              onBlur={handleUnitBlur}
              onKeyDown={handleUnitKeyDown}
              className="w-full bg-transparent border-none outline-none text-xs p-0 text-black"
              autoFocus
              maxLength={10}
            />
          ) : (
            <span 
              className={`${hasSubcategories ? '' : 'cursor-text hover:bg-muted'} rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap`}
              onClick={hasSubcategories ? undefined : handleUnitClick}
            >
              {formatUnitOfMeasure(costCode?.unit_of_measure)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-24">
        <div className={visibleColumns.quantity ? '' : 'opacity-0 pointer-events-none select-none'}>
          {!hasSubcategories && isEditingQuantity ? (
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
              className={`${hasSubcategories ? '' : 'cursor-text hover:bg-muted'} rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap`}
              onClick={hasSubcategories ? undefined : handleQuantityClick}
            >
              {parseFloat(quantity) || 0}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs font-medium ${visibleColumns.totalBudget ? '' : 'opacity-0 select-none'}`}>
          {formatCurrency(total)}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-48">
        <div className={`text-xs -ml-3 ${visibleColumns.historicalCosts ? '' : 'opacity-0 select-none'}`}>
          {historicalActual !== null ? formatCurrency(historicalActual) : '-'}
        </div>
      </TableCell>
      <TableCell className="px-3 py-0 w-32">
        <div className={`text-xs font-medium ${getVarianceColor(variance)} ${visibleColumns.variance ? '' : 'opacity-0 select-none'}`}>
          {formatVariance(variance)}
        </div>
      </TableCell>
      <TableCell className={`px-1 py-0 w-20 sticky right-0 ${isSelected ? 'bg-blue-50' : 'bg-background'}`}>
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailsModal(true)}
            className="h-6 w-6 p-0 text-primary hover:text-primary/80"
          >
            <Eye className="h-icon-sm w-icon-sm" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
    
    {showDetailsModal && costCode && (
      <ViewBudgetDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        budgetItem={item}
        projectId={item.project_id}
      />
    )}
    </>
  );
}
