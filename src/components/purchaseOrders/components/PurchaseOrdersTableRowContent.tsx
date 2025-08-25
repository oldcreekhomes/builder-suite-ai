import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PurchaseOrdersTableRowActions } from './PurchaseOrdersTableRowActions';
import { StatusSelector } from './StatusSelector';
import { NotesEditor } from './NotesEditor';
import { FilesCell } from './FilesCell';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowContentProps {
  item: PurchaseOrder;
  isSelected: boolean;
  isDeleting: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onDelete: (itemId: string) => void;
  onSendClick: () => void;
  onTestEmailClick: () => void;
  onEditClick: () => void;
}

export function PurchaseOrdersTableRowContent({
  item,
  isSelected,
  isDeleting,
  onCheckboxChange,
  onUpdateStatus,
  onUpdateNotes,
  onDelete,
  onSendClick,
  onTestEmailClick,
  onEditClick
}: PurchaseOrdersTableRowContentProps) {
  const costCode = item.cost_codes;

  return (
    <TableRow className="h-12">
      <TableCell className="w-12 py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      
      <TableCell className="py-1">
        <div className="text-sm">
          <div className="font-medium">{costCode?.code}</div>
          <div className="text-gray-500 text-xs truncate max-w-[200px]">
            {costCode?.name}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="py-1">
        <div className="text-sm font-medium">
          {item.companies?.company_name || 'N/A'}
        </div>
      </TableCell>
      
      <TableCell className="py-1">
        <StatusSelector
          value={item.status}
          onChange={(status) => onUpdateStatus(item.id, status)}
        />
      </TableCell>
      
      <TableCell className="py-1">
        <div className="text-sm font-medium">
          {item.total_amount ? `$${item.total_amount.toLocaleString()}` : 'N/A'}
        </div>
      </TableCell>
      
      <TableCell className="py-1">
        <NotesEditor
          value={item.notes || ''}
          onChange={(notes) => onUpdateNotes(item.id, notes)}
        />
      </TableCell>
      
      <TableCell className="py-1">
        <FilesCell files={item.files} />
      </TableCell>
      
      <PurchaseOrdersTableRowActions
        item={item}
        costCode={costCode}
        onDelete={onDelete}
        onSendClick={onSendClick}
        onTestEmailClick={onTestEmailClick}
        onEditClick={onEditClick}
        isDeleting={isDeleting}
      />
    </TableRow>
  );
}