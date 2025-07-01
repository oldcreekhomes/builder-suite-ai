
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Check, X } from 'lucide-react';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid';
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
      <div className="text-sm text-gray-500 italic ml-16">
        No companies associated with this cost code
      </div>
    );
  }

  return (
    <div className="ml-16 py-2 space-y-2">
      {companies.map((biddingCompany) => (
        <div key={biddingCompany.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <Building2 className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium text-sm">{biddingCompany.companies.company_name}</div>
              <div className="text-xs text-gray-500">{biddingCompany.companies.company_type}</div>
            </div>
          </div>
          
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
        </div>
      ))}
    </div>
  );
}
