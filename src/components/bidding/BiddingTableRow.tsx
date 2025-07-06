
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BiddingCompanyList } from './BiddingCompanyList';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowProps {
  item: any; // Project bidding item with cost_codes relation and companies
  onDelete: (itemId: string) => void;
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  onUpdatePrice: (biddingItemId: string, companyId: string, price: number | null) => void;
  onUpdateDueDate: (biddingItemId: string, companyId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (biddingItemId: string, companyId: string, reminderDate: string | null) => void;
  onUploadProposal: (biddingItemId: string, companyId: string, file: File) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  isReadOnly?: boolean;
}

export function BiddingTableRow({ 
  item, 
  onDelete,
  onToggleBidStatus,
  onUpdatePrice,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUploadProposal,
  onDeleteCompany,
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange,
  isDeleting = false,
  isReadOnly = false
}: BiddingTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const costCode = item.cost_codes as CostCode;

  return (
    <>
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
        <TableCell className="w-12 py-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="font-medium py-1 text-sm" style={{ paddingLeft: '50px' }}>
          <div className="flex items-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-2 hover:bg-gray-100 rounded p-1"
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
        <TableCell className="py-1"></TableCell>
        <TableCell className="py-1"></TableCell>
        <TableCell className="py-1"></TableCell>
        <TableCell className="py-1"></TableCell>
        <TableCell className="py-1"></TableCell>
        <TableCell className="py-1">
          {!isReadOnly && (
            <DeleteButton
              onDelete={() => onDelete(item.id)}
              title="Delete Bidding Item"
              description={`Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
              size="sm"
              variant="ghost"
              isLoading={isDeleting}
              showIcon={true}
            />
          )}
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <BiddingCompanyList
          biddingItemId={item.id}
          companies={item.project_bidding_companies || []}
          onToggleBidStatus={onToggleBidStatus}
          onUpdatePrice={onUpdatePrice}
          onUpdateDueDate={onUpdateDueDate}
          onUpdateReminderDate={onUpdateReminderDate}
          onUploadProposal={onUploadProposal}
          onDeleteCompany={onDeleteCompany}
          isReadOnly={isReadOnly}
        />
      )}
    </>
  );
}
