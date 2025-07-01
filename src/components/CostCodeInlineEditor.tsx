
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodeInlineEditorProps {
  costCode: CostCode;
  field: 'quantity' | 'price' | 'unit_of_measure' | 'has_specifications' | 'has_bidding';
  onUpdate: (costCodeId: string, updates: any) => void;
}

export function CostCodeInlineEditor({ costCode, field, onUpdate }: CostCodeInlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(() => {
    switch (field) {
      case 'quantity':
        return costCode.quantity || '';
      case 'price':
        return costCode.price?.toString() || '';
      case 'unit_of_measure':
        return costCode.unit_of_measure || '';
      case 'has_specifications':
        return costCode.has_specifications ? 'yes' : 'no';
      case 'has_bidding':
        return costCode.has_bidding ? 'yes' : 'no';
      default:
        return '';
    }
  });

  const formatUnitOfMeasure = (unit: string | null) => {
    if (!unit) return "-";
    
    const unitMap: Record<string, string> = {
      "each": "EA",
      "square-feet": "SF", 
      "linear-feet": "LF",
      "square-yard": "SY",
      "cubic-yard": "CY"
    };
    
    return unitMap[unit] || unit.toUpperCase();
  };

  const handleSave = () => {
    let updateData: any = {};
    
    switch (field) {
      case 'quantity':
        updateData.quantity = value;
        break;
      case 'price':
        updateData.price = value ? parseFloat(value) : null;
        break;
      case 'unit_of_measure':
        updateData.unit_of_measure = value;
        break;
      case 'has_specifications':
        updateData.has_specifications = value;
        break;
      case 'has_bidding':
        updateData.has_bidding = value;
        break;
    }
    
    onUpdate(costCode.id, updateData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset value to original
    switch (field) {
      case 'quantity':
        setValue(costCode.quantity || '');
        break;
      case 'price':
        setValue(costCode.price?.toString() || '');
        break;
      case 'unit_of_measure':
        setValue(costCode.unit_of_measure || '');
        break;
      case 'has_specifications':
        setValue(costCode.has_specifications ? 'yes' : 'no');
        break;
      case 'has_bidding':
        setValue(costCode.has_bidding ? 'yes' : 'no');
        break;
    }
    setIsEditing(false);
  };

  const displayValue = () => {
    switch (field) {
      case 'quantity':
        return costCode.quantity || "-";
      case 'price':
        return costCode.price ? `$${costCode.price.toFixed(2)}` : "-";
      case 'unit_of_measure':
        return formatUnitOfMeasure(costCode.unit_of_measure);
      case 'has_specifications':
        return costCode.has_specifications ? "Yes" : "No";
      case 'has_bidding':
        return costCode.has_bidding ? "Yes" : "No";
      default:
        return "-";
    }
  };

  if (!isEditing) {
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded group"
        onClick={() => setIsEditing(true)}
      >
        <span className="text-sm">{displayValue()}</span>
        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      </div>
    );
  }

  if (field === 'has_specifications' || field === 'has_bidding') {
    return (
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  if (field === 'unit_of_measure') {
    return (
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="each">Each</SelectItem>
            <SelectItem value="square-feet">Square Feet</SelectItem>
            <SelectItem value="linear-feet">Linear Feet</SelectItem>
            <SelectItem value="square-yard">Square Yard</SelectItem>
            <SelectItem value="cubic-yard">Cubic Yard</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type={field === 'price' ? 'number' : 'text'}
        step={field === 'price' ? '0.01' : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        autoFocus
      />
      <Button size="sm" variant="ghost" onClick={handleSave}>
        <Check className="h-4 w-4 text-green-600" />
      </Button>
      <Button size="sm" variant="ghost" onClick={handleCancel}>
        <X className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  );
}
