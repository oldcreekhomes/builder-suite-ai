
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteButton } from '@/components/ui/delete-button';
import { Building2, Check, X, Upload, FileText } from 'lucide-react';

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

interface BiddingCompanyListProps {
  biddingItemId: string;
  companies: BiddingCompany[];
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  isReadOnly?: boolean;
}

export function BiddingCompanyList({ 
  biddingItemId, 
  companies, 
  onToggleBidStatus, 
  isReadOnly = false 
}: BiddingCompanyListProps) {
  if (companies.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={9} className="text-sm text-gray-500 italic text-center py-4">
          No companies associated with this cost code
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {companies.map((biddingCompany) => (
        <TableRow key={biddingCompany.id} className="bg-gray-50/50">
          <TableCell className="w-12 py-1"></TableCell>
          <TableCell className="py-1 text-sm" style={{ paddingLeft: '70px' }}>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-medium text-sm">{biddingCompany.companies.company_name}</div>
                <div className="text-xs text-gray-500">{biddingCompany.companies.company_type}</div>
              </div>
            </div>
          </TableCell>
          <TableCell className="py-1 text-sm">
            <div className="flex items-center space-x-2">
              <Badge 
                variant={biddingCompany.bid_status === 'will_bid' ? 'default' : 'secondary'}
                className={
                  biddingCompany.bid_status === 'will_bid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }
              >
                {biddingCompany.bid_status === 'will_bid' ? (
                  <><Check className="h-3 w-3 mr-1" /> Will Bid</>
                ) : (
                  <><X className="h-3 w-3 mr-1" /> Will Not Bid</>
                )}
              </Badge>
              {!isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleBidStatus(
                    biddingItemId, 
                    biddingCompany.company_id, 
                    biddingCompany.bid_status
                  )}
                >
                  Toggle
                </Button>
              )}
            </div>
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="number"
              placeholder="$0.00"
              value={biddingCompany.price || ''}
              className="w-24 h-8 text-sm"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            <div className="flex items-center space-x-2">
              {biddingCompany.proposals ? (
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">{biddingCompany.proposals}</span>
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
              value={biddingCompany.due_date ? new Date(biddingCompany.due_date).toISOString().split('T')[0] : ''}
              className="w-32 h-8 text-sm"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="date"
              value={biddingCompany.reminder_date ? new Date(biddingCompany.reminder_date).toISOString().split('T')[0] : ''}
              className="w-32 h-8 text-sm"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            {!isReadOnly && (
              <DeleteButton
                onDelete={() => {/* Handle delete company */}}
                title="Remove Company"
                description={`Are you sure you want to remove "${biddingCompany.companies.company_name}" from this bidding item?`}
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
