import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteButton } from '@/components/ui/delete-button';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
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
  proposals: string[] | null;
  companies: Company;
}

interface BiddingCompanyRowProps {
  biddingItemId: string;
  biddingCompany: BiddingCompany;
  localPrice: string;
  onBidStatusChange: (companyId: string, newStatus: string) => void;
  onPriceChange: (companyId: string, value: string) => void;
  onPriceBlur: (companyId: string, value: string) => void;
  onFileUpload: (companyId: string) => void;
  onDeleteAllFiles: (companyId: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  onSendEmail?: (companyId: string) => void;
  isReadOnly?: boolean;
}

export function BiddingCompanyRow({
  biddingItemId,
  biddingCompany,
  localPrice,
  onBidStatusChange,
  onPriceChange,
  onPriceBlur,
  onFileUpload,
  onDeleteAllFiles,
  onDeleteCompany,
  onSendEmail,
  isReadOnly = false
}: BiddingCompanyRowProps) {
  return (
    <TableRow className="bg-gray-50/50">
      <TableCell className="w-12 py-1"></TableCell>
        <TableCell className="py-1 text-sm">
        <div className="font-medium text-sm whitespace-nowrap ml-8">
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
          onDeleteAllFiles={onDeleteAllFiles}
          isReadOnly={isReadOnly}
        />
      </TableCell>
      <TableCell className="py-1">
        <div className="flex items-center gap-1">
          {!isReadOnly && onSendEmail && (
            <Button
              onClick={() => onSendEmail(biddingCompany.company_id)}
              size="sm"
              variant="ghost"
              title="Send Email to Company"
              className="h-6 w-6 p-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          )}
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
        </div>
      </TableCell>
    </TableRow>
  );
}