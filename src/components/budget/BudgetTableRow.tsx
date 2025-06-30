
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BudgetTableRowProps {
  item: any; // Project budget item with cost_codes relation
  onUpdate: (id: string, quantity: number, unit_price: number) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
}

export function BudgetTableRow({ 
  item, 
  onUpdate, 
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange
}: BudgetTableRowProps) {
  const [quantity, setQuantity] = useState((item.quantity || 0).toString());
  const [unitPrice, setUnitPrice] = useState((item.unit_price || 0).toString());
  
  const costCode = item.cost_codes as CostCode;
  const total = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  const handleQuantityBlur = () => {
    const numQuantity = parseFloat(quantity) || 0;
    const numUnitPrice = parseFloat(unitPrice) || 0;
    
    // Only update if values have changed
    if (numQuantity !== (item.quantity || 0) || numUnitPrice !== (item.unit_price || 0)) {
      onUpdate(item.id, numQuantity, numUnitPrice);
    }
  };

  const handleUnitPriceBlur = () => {
    const numQuantity = parseFloat(quantity) || 0;
    const numUnitPrice = parseFloat(unitPrice) || 0;
    
    // Only update if values have changed
    if (numQuantity !== (item.quantity || 0) || numUnitPrice !== (item.unit_price || 0)) {
      onUpdate(item.id, numQuantity, numUnitPrice);
    }
  };

  const handleQuantityKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleUnitPriceKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <TableRow className={isSelected ? 'bg-blue-50' : ''}>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="font-medium" style={{ paddingLeft: '30px' }}>
        {costCode?.code}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {costCode?.name}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        <Input
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleQuantityBlur}
          onKeyPress={handleQuantityKeyPress}
          className="w-20 h-8"
        />
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {formatUnitOfMeasure(costCode?.unit_of_measure)}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        <Input
          type="number"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={handleUnitPriceBlur}
          onKeyPress={handleUnitPriceKeyPress}
          className="w-24 h-8"
        />
      </TableCell>
      <TableCell className="font-medium" style={{ paddingLeft: '30px' }}>
        ${total.toFixed(2)}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {/* Actions column - could be used for additional actions if needed */}
      </TableCell>
    </TableRow>
  );
}
