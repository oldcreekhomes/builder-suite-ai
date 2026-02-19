import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { BiddingDatePicker } from './BiddingDatePicker';
import { BiddingTableRowSpecs } from './BiddingTableRowSpecs';
import { BiddingTableRowFiles } from './BiddingTableRowFiles';
import { BiddingTableRowActions } from './BiddingTableRowActions';
import { CloseBidPackageDialog } from './CloseBidPackageDialog';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowContentProps {
  item: any;
  costCode: CostCode;
  isSelected: boolean;
  isDeleting?: boolean;
  isReadOnly?: boolean;
  projectId?: string;
  onRowClick: () => void;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateDueDate: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications: (itemId: string, specifications: string) => void;
  onDelete: (itemId: string) => void;
  onSendClick: () => void;
  onTestEmailClick?: () => void;
  onAddCompaniesClick?: () => void;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
  onLinkProjectFiles?: (itemId: string, storagePaths: string[]) => void;
  onCloseWithPO?: () => void;
}

export function BiddingTableRowContent({
  item,
  costCode,
  isSelected,
  isDeleting = false,
  isReadOnly = false,
  projectId,
  onRowClick,
  onCheckboxChange,
  onUpdateStatus,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUpdateSpecifications,
  onDelete,
  onSendClick,
  onTestEmailClick,
  onAddCompaniesClick,
  onFileUpload,
  onDeleteIndividualFile,
  onLinkProjectFiles,
  onCloseWithPO
}: BiddingTableRowContentProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const handleStatusChange = (value: string) => {
    if (value === 'closed') {
      setShowCloseDialog(true);
    } else {
      onUpdateStatus(item.id, value);
    }
  };

  const handleJustClose = () => {
    onUpdateStatus(item.id, 'closed');
  };

  const handleCreatePO = () => {
    onCloseWithPO?.();
  };

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <TableRow
      className={`${isSelected ? 'bg-blue-50' : ''} cursor-pointer`}
      onClick={onRowClick}
    >
      <TableCell className="w-10" onClick={stopProp}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
        />
      </TableCell>
      <TableCell className="w-56">
        <div className="hover:text-primary">
          {costCode?.code} - {costCode?.name}
        </div>
      </TableCell>
      <TableCell className="w-28" onClick={stopProp}>
        <Select
          value={item.status || 'draft'}
          onValueChange={handleStatusChange}
          disabled={isReadOnly}
        >
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-md z-50">
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <CloseBidPackageDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        costCodeName={`${costCode?.code} - ${costCode?.name}`}
        onJustClose={handleJustClose}
        onCreatePO={handleCreatePO}
      />
      <TableCell className={cn("w-28", !item.sent_on && "text-muted-foreground")}>
        {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
      </TableCell>
      <TableCell className="w-28" onClick={stopProp}>
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
      <TableCell className="w-28" onClick={stopProp}>
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
        cellClassName="w-24"
        onCellClick={stopProp}
      />
      <BiddingTableRowFiles
        item={item}
        isReadOnly={isReadOnly}
        projectId={projectId}
        onFileUpload={onFileUpload}
        onDeleteIndividualFile={onDeleteIndividualFile}
        onLinkProjectFiles={onLinkProjectFiles}
        onCellClick={stopProp}
      />
      <BiddingTableRowActions
        item={item}
        costCode={costCode}
        onDelete={onDelete}
        onSendClick={onSendClick}
        onTestEmailClick={onTestEmailClick}
        onAddCompaniesClick={onAddCompaniesClick}
        isDeleting={isDeleting}
        isReadOnly={isReadOnly}
        onCellClick={stopProp}
      />
    </TableRow>
  );
}
