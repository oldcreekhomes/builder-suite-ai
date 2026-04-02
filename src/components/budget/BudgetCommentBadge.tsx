import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type BudgetComment = 'finalized' | 'additional_costs_expected' | null;

const COMMENT_OPTIONS: { value: BudgetComment; label: string; className: string }[] = [
  {
    value: 'finalized',
    label: 'Finalized',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    value: 'additional_costs_expected',
    label: 'Additional Costs Expected',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
];

interface BudgetCommentBadgeProps {
  value: BudgetComment;
  onChange: (value: BudgetComment) => void;
  disabled?: boolean;
}

export function BudgetCommentBadge({ value, onChange, disabled = false }: BudgetCommentBadgeProps) {
  const selected = COMMENT_OPTIONS.find((o) => o.value === value);

  return (
    <Select
      value={value || 'none'}
      onValueChange={(v) => onChange(v === 'none' ? null : (v as BudgetComment))}
      disabled={disabled}
    >
      <SelectTrigger className="h-6 border-0 shadow-none bg-transparent p-0 w-auto min-w-0 gap-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:ml-0.5">
        {selected ? (
          <Badge variant="outline" className={`${selected.className} text-xs cursor-pointer`}>
            {selected.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">–</span>
        )}
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        <SelectItem value="none" className="text-xs">
          None
        </SelectItem>
        {COMMENT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
            <Badge variant="outline" className={`${opt.className} text-xs`}>
              {opt.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getCommentBadgeDisplay(value: BudgetComment) {
  const option = COMMENT_OPTIONS.find((o) => o.value === value);
  if (!option) return null;
  return option;
}
