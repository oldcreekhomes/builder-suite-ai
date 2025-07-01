
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowProps {
  item: any; // Project bidding item with cost_codes relation
  onUpdate: (id: string, quantity: number, unit_price: number) => void;
  onDelete: (itemId: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
}

export function BiddingTableRow({ 
  item, 
  onUpdate, 
  onDelete,
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange,
  isDeleting = false
}: BiddingTableRowProps) {
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
        <Input
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={handleQuantityBlur}
          onKeyPress={handleQuantityKeyPress}
          className="w-20 h-7 text-sm"
        />
      </TableCell>
      <TableCell className="py-1 text-sm">
        {formatUnitOfMeasure(costCode?.unit_of_measure)}
      </TableCell>
      <TableCell className="py-1">
        <Input
          type="number"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={handleUnitPriceBlur}
          onKeyPress={handleUnitPriceKeyPress}
          className="w-24 h-7 text-sm"
        />
      </TableCell>
      <TableCell className="font-medium py-1 text-sm">
        {formatCurrency(total)}
      </TableCell>
      <TableCell className="py-1">
        <DeleteButton
          onDelete={() => onDelete(item.id)}
          title="Delete Bidding Item"
          description={`Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
          size="sm"
          variant="ghost"
          isLoading={isDeleting}
          showIcon={true}
        />
      </TableCell>
    </TableRow>
  );
}
