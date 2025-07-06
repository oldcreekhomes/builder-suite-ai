import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BiddingDatePicker } from './BiddingDatePicker';
import { BiddingTableRowSpecs } from './BiddingTableRowSpecs';
import { BiddingTableRowFiles } from './BiddingTableRowFiles';
import { BiddingTableRowActions } from './BiddingTableRowActions';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowContentProps {
  item: any;
  costCode: CostCode;
  isExpanded: boolean;
  isSelected: boolean;
  isDeleting?: boolean;
  isReadOnly?: boolean;
  onToggleExpanded: () => void;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateDueDate: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications: (itemId: string, specifications: string) => void;
  onDelete: (itemId: string) => void;
  onSendClick: () => void;
}

export function BiddingTableRowContent({
  item,
  costCode,
  isExpanded,
  isSelected,
  isDeleting = false,
  isReadOnly = false,
  onToggleExpanded,
  onCheckboxChange,
  onUpdateStatus,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUpdateSpecifications,
  onDelete,
  onSendClick
}: BiddingTableRowContentProps) {
  return (
    <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
      <TableCell className="w-12 py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="font-medium py-1 text-sm">
        <div className="flex items-center">
          <button
            onClick={onToggleExpanded}
            className="hover:bg-gray-100 rounded mr-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {costCode?.code} - {costCode?.name}
        </div>
      </TableCell>
      <TableCell className="py-1">
        <Select 
          value={item.status || 'draft'} 
          onValueChange={(value) => onUpdateStatus(item.id, value)}
          disabled={isReadOnly}
        >
          <SelectTrigger className="w-20 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-md z-50">
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-1 w-32">
        <BiddingDatePicker
          value={item.due_date}
          onChange={(biddingItemId, companyId, date) => onUpdateDueDate(biddingItemId, date)}
          placeholder="mm/dd/yyyy"
          disabled={isReadOnly}
          companyId=""
          biddingItemId={item.id}
          field="due_date"
        />
      </TableCell>
      <TableCell className="py-1 w-32">
        <BiddingDatePicker
          value={item.reminder_date}
          onChange={(biddingItemId, companyId, date) => onUpdateReminderDate(biddingItemId, date)}
          placeholder="mm/dd/yyyy"
          disabled={isReadOnly}
          companyId=""
          biddingItemId={item.id}
          field="reminder_date"
          dueDate={item.due_date}
        />
      </TableCell>
      <BiddingTableRowSpecs
        item={item}
        costCode={costCode}
        onUpdateSpecifications={onUpdateSpecifications}
        isReadOnly={isReadOnly}
      />
      <BiddingTableRowFiles
        item={item}
        isReadOnly={isReadOnly}
      />
      <BiddingTableRowActions
        item={item}
        costCode={costCode}
        onDelete={onDelete}
        onSendClick={onSendClick}
        isDeleting={isDeleting}
        isReadOnly={isReadOnly}
      />
    </TableRow>
  );
}