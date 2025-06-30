
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BudgetTableRowProps {
  item: any; // Project budget item with cost_codes relation
  isEditing: boolean;
  editValue?: { quantity: string; unit_price: string };
  onEdit: (budgetId: string, currentQuantity: number, currentPrice: number) => void;
  onSave: (budgetId: string) => void;
  onCancel: (budgetId: string) => void;
  onInputChange: (budgetId: string, field: 'quantity' | 'unit_price', value: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
}

export function BudgetTableRow({ 
  item, 
  isEditing, 
  editValue, 
  onEdit, 
  onSave, 
  onCancel, 
  onInputChange, 
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange
}: BudgetTableRowProps) {
  const costCode = item.cost_codes as CostCode;
  const total = (item.quantity || 0) * (item.unit_price || 0);

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
        {isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editValue?.quantity || ''}
            onChange={(e) => onInputChange(item.id, 'quantity', e.target.value)}
            className="w-20"
          />
        ) : (
          item.quantity || 0
        )}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {formatUnitOfMeasure(costCode?.unit_of_measure)}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editValue?.unit_price || ''}
            onChange={(e) => onInputChange(item.id, 'unit_price', e.target.value)}
            className="w-24"
          />
        ) : (
          `$${(item.unit_price || 0).toFixed(2)}`
        )}
      </TableCell>
      <TableCell className="font-medium" style={{ paddingLeft: '30px' }}>
        ${total.toFixed(2)}
      </TableCell>
      <TableCell style={{ paddingLeft: '30px' }}>
        {isEditing ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSave(item.id)}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item.id, item.quantity || 0, item.unit_price || 0)}
          >
            Edit
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
