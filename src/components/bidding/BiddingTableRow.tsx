
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Upload, FileText, Calendar } from 'lucide-react';
import { BiddingCompanyList } from './BiddingCompanyList';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowProps {
  item: any; // Project bidding item with cost_codes relation and companies
  onDelete: (itemId: string) => void;
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
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
            {costCode?.code}
          </div>
        </TableCell>
        <TableCell className="py-1 text-sm">
          {costCode?.name}
        </TableCell>
        <TableCell className="py-1 text-sm">
          <span className="text-green-600 font-medium">
            {item.project_bidding_companies?.some((c: any) => c.bid_status === 'will_bid') ? 'Yes' : 'No'}
          </span>
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="number"
            placeholder="$0.00"
            value={item.price || ''}
            className="w-24 h-8 text-sm"
            disabled={isReadOnly}
          />
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center space-x-2">
            {item.proposals ? (
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">{item.proposals}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={isReadOnly}
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="date"
            value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
            className="w-32 h-8 text-sm"
            disabled={isReadOnly}
          />
        </TableCell>
        <TableCell className="py-1">
          <Input
            type="date"
            value={item.reminder_date ? new Date(item.reminder_date).toISOString().split('T')[0] : ''}
            className="w-32 h-8 text-sm"
            disabled={isReadOnly}
          />
        </TableCell>
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
        <TableRow>
          <TableCell colSpan={9} className="p-0">
            <BiddingCompanyList
              biddingItemId={item.id}
              companies={item.project_bidding_companies || []}
              onToggleBidStatus={onToggleBidStatus}
              isReadOnly={isReadOnly}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
