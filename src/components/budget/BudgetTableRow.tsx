import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteButton } from '@/components/ui/delete-button';
import type { Tables } from '@/integrations/supabase/types';

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
  showVarianceAsPercentage = false
}: BudgetTableRowProps) {
  const [quantity, setQuantity] = useState((item.quantity || 0).toString());
  const [unitPrice, setUnitPrice] = useState((item.unit_price || 0).toString());
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  
  const costCode = item.cost_codes as CostCode;
  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  const historicalActual = historicalActualCosts[costCode?.id] || null;
  
  const calculateVariance = () => {
    if (historicalActual === null || total === 0) return null;
    if (showVarianceAsPercentage) {
      return ((historicalActual - total) / total) * 100;
    }
    return historicalActual - total;
  };
  
  const variance = calculateVariance();
  
  const getVarianceColor = (variance: number | null) => {
    if (variance === null) return 'text-gray-400';
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < 0) return 'text-green-600'; // Under budget
    return 'text-gray-600'; // On budget
  };
  
  const formatVariance = (variance: number | null) => {
    if (variance === null) return '-';
    if (showVarianceAsPercentage) {
      return `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`;
    }
    return `${variance > 0 ? '+' : ''}${formatCurrency(Math.abs(variance))}`;
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

  const handleUnitChange = (value: string) => {
    onUpdateUnit(costCode.id, value);
    setIsEditingUnit(false);
  };

  const handleUnitKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts for unit selection
    if (e.key === 'e') {
      e.preventDefault();
      handleUnitChange('each');
      return;
    } else if (e.key === 's') {
      e.preventDefault();
      handleUnitChange('square-feet');
      return;
    } else if (e.key === 'l') {
      e.preventDefault();
      handleUnitChange('linear-feet');
      return;
    } else if (e.key === 'y') {
      e.preventDefault();
      handleUnitChange('square-yard');
      return;
    } else if (e.key === 'c') {
      e.preventDefault();
      handleUnitChange('cubic-yard');
      return;
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      setIsEditingUnit(false);
      // Move to Quantity column
      setTimeout(() => {
        setIsEditingQuantity(true);
      }, 50);
    }
  };

  const handleQuantityClick = () => {
    setIsEditingQuantity(true);
    setQuantity((item.quantity || 0).toString());
  };

  const handlePriceClick = () => {
    setIsEditingPrice(true);
    setUnitPrice((item.unit_price || 0).toString());
  };

  const handleUnitClick = () => {
    setIsEditingUnit(true);
  };

  const handleUnitValueChange = (value: string) => {
    handleUnitChange(value);
  };

  const handleUnitOpenChange = (open: boolean) => {
    if (!open) {
      setIsEditingUnit(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  return (
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
      <TableCell className="px-1 py-0 w-20">
        {isEditingPrice ? (
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
            ${Math.round(parseFloat(unitPrice) || 0).toLocaleString()}
          </span>
        )}
      </TableCell>
      <TableCell className="px-1 py-0 w-16">
        {isEditingUnit ? (
          <Select 
            value={costCode?.unit_of_measure || ""} 
            onValueChange={handleUnitValueChange}
            onOpenChange={handleUnitOpenChange}
            open={true}
          >
            <SelectTrigger 
              className="h-6 border-none shadow-none bg-transparent text-xs p-0 focus:ring-0"
              onKeyDown={handleUnitKeyDown}
            >
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50">
              <SelectItem value="each">EA</SelectItem>
              <SelectItem value="square-feet">SF</SelectItem>
              <SelectItem value="linear-feet">LF</SelectItem>
              <SelectItem value="square-yard">SY</SelectItem>
              <SelectItem value="cubic-yard">CY</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span 
            className="cursor-text hover:bg-muted rounded px-1 py-0.5 inline-block text-xs text-black whitespace-nowrap"
            onClick={handleUnitClick}
          >
            {formatUnitOfMeasure(costCode?.unit_of_measure)}
          </span>
        )}
      </TableCell>
      <TableCell className="px-1 py-0 w-20">
        {isEditingQuantity ? (
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
      </TableCell>
      <TableCell className="px-1 py-0 w-24">
        <div className="text-xs font-medium">
          {formatCurrency(total)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-24">
        <div className="text-xs">
          {historicalActual !== null ? formatCurrency(historicalActual) : '-'}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-24">
        <div className={`text-xs font-medium ${getVarianceColor(variance)}`}>
          {formatVariance(variance)}
        </div>
      </TableCell>
      <TableCell className="px-1 py-0 w-20">
        <div>
          <DeleteButton
            onDelete={() => onDelete(item.id)}
            title="Delete Budget Item"
            description={`Are you sure you want to delete the budget item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
            size="sm"
            variant="ghost"
            isLoading={isDeleting}
            showIcon={true}
            className="tabindex-[-1]"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
