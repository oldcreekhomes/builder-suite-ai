import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [notesOpen, setNotesOpen] = useState(false);
  const costCode = item.cost_codes;
  const lines = (item as any).purchase_order_lines || [];
  const hasMultipleLines = lines.length > 1;

  // Group lines by cost code for tooltip
  const groupedLines = React.useMemo(() => {
    if (!hasMultipleLines) return [];
    const groups: Record<string, { code: string; name: string; total: number }> = {};
    lines.forEach((line: any) => {
      const cc = line.cost_codes;
      const key = cc?.id || 'unknown';
      if (!groups[key]) {
        groups[key] = { code: cc?.code || '—', name: cc?.name || 'Unknown', total: 0 };
      }
      groups[key].total += Number(line.amount) || 0;
    });
    return Object.values(groups).sort((a, b) => parseInt(a.code) - parseInt(b.code));
  }, [lines, hasMultipleLines]);

  const renderCostCodeCell = () => {
    if (!hasMultipleLines) {
      return (
        <div className="font-medium">
          {costCode ? `${costCode.code}: ${costCode.name}` : 'N/A'}
        </div>
      );
    }

    const firstLine = lines[0]?.cost_codes;
    const total = groupedLines.reduce((sum, g) => sum + g.total, 0);
    const count = groupedLines.length;

    if (count <= 1) {
      return (
        <div className="font-medium">
          {firstLine ? `${firstLine.code}: ${firstLine.name}` : 'N/A'}
        </div>
      );
    }

    const display = `${groupedLines[0].code}: ${groupedLines[0].name} +${count - 1}`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-default font-medium text-left text-sm">
            {display}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {groupedLines.map((g, i) => (
                <div key={i} className="flex justify-between gap-4 text-xs">
                  <span>{g.code}: {g.name}</span>
                  <span>${g.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                <span>Total:</span>
                <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
          {renderCostCodeCell()}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {item.companies?.company_name || 'N/A'}
        </div>
      </TableCell>
      
      <TableCell>
        <div className="font-medium">
          {item.total_amount ? `$${item.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
        </div>
      </TableCell>
      
      <TableCell>
        <div className={item.sent_at ? 'font-medium' : 'font-medium text-muted-foreground'}>
          {item.sent_at
            ? new Date(item.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Not sent'}
        </div>
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
        onNotesClick={() => setNotesOpen(true)}
        isDeleting={isDeleting}
      />

      <NotesEditor
        value={item.notes || ''}
        onChange={(notes) => onUpdateNotes(item.id, notes)}
        open={notesOpen}
        onOpenChange={setNotesOpen}
      />
    </TableRow>
  );
}
