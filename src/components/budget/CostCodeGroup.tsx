
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface CostCodeGroupProps {
  group: string;
  codes: CostCode[];
  isExpanded: boolean;
  isGroupSelected: boolean;
  isGroupPartiallySelected: boolean;
  selectedCostCodes: Set<string>;
  onGroupToggle: (group: string) => void;
  onGroupCheckboxChange: (group: string, checked: boolean) => void;
  onCostCodeToggle: (costCodeId: string, checked: boolean) => void;
}

export function CostCodeGroup({
  group,
  codes,
  isExpanded,
  isGroupSelected,
  isGroupPartiallySelected,
  selectedCostCodes,
  onGroupToggle,
  onGroupCheckboxChange,
  onCostCodeToggle,
}: CostCodeGroupProps) {
  return (
    <Collapsible 
      open={isExpanded}
      onOpenChange={() => onGroupToggle(group)}
    >
      <CollapsibleTrigger className="flex items-center w-full p-2 hover:bg-gray-50 rounded">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isGroupSelected}
            ref={(el) => {
              if (el && 'indeterminate' in el) {
                (el as any).indeterminate = isGroupPartiallySelected && !isGroupSelected;
              }
            }}
            onCheckedChange={(checked) => onGroupCheckboxChange(group, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
          />
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
          <span className="font-medium text-left">{group}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pl-6 pt-2">
          {codes.map((costCode) => (
            <div key={costCode.id} className="flex items-center space-x-3">
              <Checkbox
                id={costCode.id}
                checked={selectedCostCodes.has(costCode.id)}
                onCheckedChange={(checked) => 
                  onCostCodeToggle(costCode.id, checked as boolean)
                }
              />
              <label
                htmlFor={costCode.id}
                className="text-sm cursor-pointer flex-1"
              >
                {costCode.code} - {costCode.name}
              </label>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
