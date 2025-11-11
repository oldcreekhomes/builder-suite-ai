
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Edit, LineChart } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodeInlineEditorProps {
  costCode: CostCode;
  field: 'quantity' | 'price' | 'unit_of_measure' | 'has_specifications' | 'has_bidding' | 'has_subcategories' | 'estimate';
  onUpdate: (costCodeId: string, updates: any) => void;
  onViewPriceHistory?: () => void;
  hasPriceHistory?: boolean;
}

export function CostCodeInlineEditor({ costCode, field, onUpdate, onViewPriceHistory, hasPriceHistory = false }: CostCodeInlineEditorProps) {
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
      case 'has_subcategories':
        return costCode.has_subcategories ? 'yes' : 'no';
      case 'estimate':
        return costCode.estimate ? 'yes' : 'no';
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
      "cubic-yard": "CY",
      "month": "MTH",
      "hour": "HR",
      "lump-sum": "LS"
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
        updateData.has_specifications = value === 'yes';
        break;
      case 'has_bidding':
        updateData.has_bidding = value === 'yes';
        break;
      case 'has_subcategories':
        updateData.has_subcategories = value === 'yes';
        break;
      case 'estimate':
        updateData.estimate = value === 'yes';
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
      case 'has_subcategories':
        setValue(costCode.has_subcategories ? 'yes' : 'no');
        break;
      case 'estimate':
        setValue(costCode.estimate ? 'yes' : 'no');
        break;
    }
    setIsEditing(false);
  };

  const displayValue = () => {
    switch (field) {
      case 'quantity':
        return costCode.quantity || "-";
      case 'price':
        return costCode.price ? `$${Number(costCode.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-";
      case 'unit_of_measure':
        return formatUnitOfMeasure(costCode.unit_of_measure);
      case 'has_specifications':
        return costCode.has_specifications ? "Yes" : "No";
      case 'has_bidding':
        return costCode.has_bidding ? "Yes" : "No";
      case 'has_subcategories':
        return costCode.has_subcategories ? "Yes" : "No";
      case 'estimate':
        return costCode.estimate ? "Yes" : "No";
      default:
        return "-";
    }
  };

  if (!isEditing) {
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded group min-h-[32px]"
        onClick={() => setIsEditing(true)}
      >
        <span className="text-sm">{displayValue()}</span>
        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      </div>
    );
  }

  if (field === 'has_specifications' || field === 'has_bidding' || field === 'has_subcategories' || field === 'estimate') {
    return (
      <Select 
        value={value} 
        onValueChange={(newValue) => {
          setValue(newValue);
          // Auto-save for dropdowns with proper boolean conversion
          let updateData: any = {};
          updateData[field] = newValue === 'yes';
          onUpdate(costCode.id, updateData);
          setIsEditing(false);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditing(false);
          }
        }}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field === 'unit_of_measure') {
    return (
      <Select 
        defaultOpen
        value={value} 
        onValueChange={(newValue) => {
          setValue(newValue);
          // Auto-save for dropdowns
          let updateData: any = {};
          updateData.unit_of_measure = newValue;
          onUpdate(costCode.id, updateData);
          setIsEditing(false);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditing(false);
          }
        }}
      >
        <SelectTrigger className="h-8 text-sm [&>svg]:hidden">
          <span className="text-sm">
            {formatUnitOfMeasure(value)}
          </span>
        </SelectTrigger>
        <SelectContent className="z-50">
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
    );
  }

  return (
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
      onBlur={handleSave}
      autoFocus
    />
  );
}
