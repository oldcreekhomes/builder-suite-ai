import React from 'react';
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
    const extraCount = lines.length - 1;
    const total = groupedLines.reduce((sum, g) => sum + g.total, 0);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-medium cursor-default">
              {firstLine ? `${firstLine.code}: ${firstLine.name}` : 'N/A'}
              <span className="ml-1 text-muted-foreground">+{extraCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-0">
            <table className="text-xs">
              <tbody>
                {groupedLines.map((g, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-2 py-1 font-medium whitespace-nowrap">{g.code}: {g.name}</td>
                    <td className="px-2 py-1 text-right whitespace-nowrap">${g.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="px-2 py-1">Total</td>
                  <td className="px-2 py-1 text-right">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
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
