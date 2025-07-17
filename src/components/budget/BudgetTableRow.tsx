import React, { useState, useRef } from 'react';
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
}

export function BudgetTableRow({ 
  item, 
  onUpdate, 
  onUpdateUnit,
  onDelete,
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange,
  isDeleting = false
}: BudgetTableRowProps) {
  const [quantity, setQuantity] = useState((item.quantity || 0).toString());
  const [unitPrice, setUnitPrice] = useState((item.unit_price || 0).toString());
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const unitTriggerRef = useRef<HTMLButtonElement>(null);
  
  const costCode = item.cost_codes as CostCode;
  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

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
      e.stopPropagation();
      handleQuantityBlur();
      // End of editable columns - let browser handle default tab behavior
      // or could move to next row's price field in future
    }
  };

  const handleUnitPriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleUnitPriceBlur();
      // Move to Unit column
      setTimeout(() => {
        setIsEditingUnit(true);
      }, 100);
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
      e.stopPropagation();
      setIsEditingUnit(false);
      // Move to Quantity column
      setTimeout(() => {
        setIsEditingQuantity(true);
      }, 100);
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
      <TableCell className="w-12 py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="font-medium py-1 text-sm" style={{ paddingLeft: '50px' }}>
        {costCode?.code}
      </TableCell>
      <TableCell className="py-1 text-sm">
        {costCode?.name}
      </TableCell>
      <TableCell className="py-1">
        {isEditingPrice ? (
          <Input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            onBlur={handleUnitPriceBlur}
            onKeyDown={handleUnitPriceKeyDown}
            className="w-24 h-7 text-sm"
            autoFocus
          />
        ) : (
          <div 
            className="w-24 h-7 px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 flex items-center"
            onClick={handlePriceClick}
          >
            ${Math.round(parseFloat(unitPrice) || 0).toLocaleString()}
          </div>
        )}
      </TableCell>
      <TableCell className="py-1">
        {isEditingUnit ? (
          <Select 
            value={costCode?.unit_of_measure || ""} 
            onValueChange={handleUnitValueChange}
            onOpenChange={handleUnitOpenChange}
            open={true}
          >
            <SelectTrigger 
              className="w-20 h-7 text-sm"
              onKeyDown={handleUnitKeyDown}
            >
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="each">EA - (e)</SelectItem>
              <SelectItem value="square-feet">SF - (s)</SelectItem>
              <SelectItem value="linear-feet">LF - (l)</SelectItem>
              <SelectItem value="square-yard">SY - (y)</SelectItem>
              <SelectItem value="cubic-yard">CY - (c)</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div 
            className="w-20 h-7 px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 flex items-center"
            onClick={handleUnitClick}
          >
            {formatUnitOfMeasure(costCode?.unit_of_measure)}
          </div>
        )}
      </TableCell>
      <TableCell className="py-1">
        {isEditingQuantity ? (
          <Input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={handleQuantityBlur}
            onKeyDown={handleQuantityKeyDown}
            className="w-20 h-7 text-sm"
            autoFocus
          />
        ) : (
          <div 
            className="w-20 h-7 px-3 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded border border-transparent hover:border-gray-300 flex items-center"
            onClick={handleQuantityClick}
          >
            {parseFloat(quantity) || 0}
          </div>
        )}
      </TableCell>
      <TableCell className="font-medium py-1 text-sm">
        {formatCurrency(total)}
      </TableCell>
      <TableCell className="py-1">
        <div>
          <DeleteButton
            onDelete={() => onDelete(item.id)}
            title="Delete Budget Item"
            description={`Are you sure you want to delete the budget item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
            size="sm"
            variant="ghost"
            isLoading={isDeleting}
            showIcon={true}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
