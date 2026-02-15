import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PurchaseOrdersTableRowActions } from './PurchaseOrdersTableRowActions';
import { NotesEditor } from './NotesEditor';
import { FilesCell } from './FilesCell';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseOrdersTableRowContentProps {
  item: PurchaseOrder;
  isSelected: boolean;
  isDeleting: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onDelete: (item: PurchaseOrder) => void;
  onSendClick: () => void;
  onTestEmailClick: () => void;
  onEditClick: () => void;
  projectId: string;
}

export function PurchaseOrdersTableRowContent({
  item,
  isSelected,
  isDeleting,
  onCheckboxChange,
  onUpdateNotes,
  onDelete,
  onSendClick,
  onTestEmailClick,
  onEditClick,
  projectId
}: PurchaseOrdersTableRowContentProps) {
  const costCode = item.cost_codes;

  return (
    <TableRow>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      
      <TableCell>
        <div className="font-medium whitespace-nowrap">
          {item.po_number || 'Generating...'}
        </div>
      </TableCell>
      
      <TableCell>
        <div className={`${costCode?.parent_group ? 'ml-4' : ''}`}>
          <div className="font-medium">
            {costCode?.code}: {costCode?.name}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {item.companies?.company_name || 'N/A'}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {item.total_amount ? `$${item.total_amount.toLocaleString()}` : 'N/A'}
        </div>
      </TableCell>
      
      <TableCell>
        <NotesEditor
          value={item.notes || ''}
          onChange={(notes) => onUpdateNotes(item.id, notes)}
        />
      </TableCell>
      
      <TableCell>
        <FilesCell files={item.files} projectId={projectId} />
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