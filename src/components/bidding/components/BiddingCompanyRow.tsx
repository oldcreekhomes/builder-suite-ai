import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteButton } from '@/components/ui/delete-button';
import { BiddingDatePicker } from './BiddingDatePicker';
import { ProposalCell } from './ProposalCell';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid';
  price: number | null;
  proposals: string | null;
  due_date: string | null;
  reminder_date: string | null;
  companies: Company;
}

interface BiddingCompanyRowProps {
  biddingItemId: string;
  biddingCompany: BiddingCompany;
  localPrice: string;
  onBidStatusChange: (companyId: string, newStatus: string) => void;
  onPriceChange: (companyId: string, value: string) => void;
  onPriceBlur: (companyId: string, value: string) => void;
  onUpdateDueDate: (biddingItemId: string, companyId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (biddingItemId: string, companyId: string, reminderDate: string | null) => void;
  onFileUpload: (companyId: string) => void;
  onFilePreview: (fileName: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  isReadOnly?: boolean;
}

export function BiddingCompanyRow({
  biddingItemId,
  biddingCompany,
  localPrice,
  onBidStatusChange,
  onPriceChange,
  onPriceBlur,
  onUpdateDueDate,
  onUpdateReminderDate,
  onFileUpload,
  onFilePreview,
  onDeleteCompany,
  isReadOnly = false
}: BiddingCompanyRowProps) {
  return (
    <TableRow className="bg-gray-50/50">
      <TableCell className="w-12 py-1"></TableCell>
      <TableCell className="py-1 text-sm" style={{ paddingLeft: '70px' }}>
        <div className="font-medium text-sm whitespace-nowrap">
          {biddingCompany.companies.company_name}
        </div>
      </TableCell>
      <TableCell className="py-1">
        <Select 
          value={biddingCompany.bid_status} 
          onValueChange={(value) => onBidStatusChange(biddingCompany.company_id, value)}
          disabled={isReadOnly}
        >
          <SelectTrigger className="w-20 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border shadow-md z-50">
            <SelectItem value="will_bid">Yes</SelectItem>
            <SelectItem value="will_not_bid">No</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-1">
        <Input
          type="text"
          placeholder="$0.00"
          value={localPrice}
          onChange={(e) => onPriceChange(biddingCompany.company_id, e.target.value)}
          onBlur={(e) => onPriceBlur(biddingCompany.company_id, e.target.value)}
          className="w-24 h-8 text-sm"
          disabled={isReadOnly}
        />
      </TableCell>
      <TableCell className="py-1">
        <ProposalCell
          proposals={biddingCompany.proposals}
          companyId={biddingCompany.company_id}
          onFileUpload={onFileUpload}
          onFilePreview={onFilePreview}
          isReadOnly={isReadOnly}
        />
      </TableCell>
      <TableCell className="py-1 w-32">
        <BiddingDatePicker
          value={biddingCompany.due_date}
          onChange={onUpdateDueDate}
          placeholder="mm/dd/yyyy"
          disabled={isReadOnly}
          companyId={biddingCompany.company_id}
          biddingItemId={biddingItemId}
        />
      </TableCell>
      <TableCell className="py-1 w-32">
        <BiddingDatePicker
          value={biddingCompany.reminder_date}
          onChange={onUpdateReminderDate}
          placeholder="mm/dd/yyyy"
          disabled={isReadOnly}
          companyId={biddingCompany.company_id}
          biddingItemId={biddingItemId}
        />
      </TableCell>
      <TableCell className="py-1">
        {!isReadOnly && (
          <DeleteButton
            onDelete={() => onDeleteCompany(biddingItemId, biddingCompany.company_id)}
            title="Remove Company"
            description={`Are you sure you want to remove "${biddingCompany.companies.company_name}" from this bidding item?`}
            size="sm"
            variant="ghost"
            showIcon={true}
          />
        )}
      </TableCell>
    </TableRow>
  );
}