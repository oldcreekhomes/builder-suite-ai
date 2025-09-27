import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BiddingCompanyList } from './BiddingCompanyList';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BidPackageDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any; // Project bidding item with cost_codes relation and companies
  costCode: CostCode;
  onToggleBidStatus: (biddingItemId: string, bidId: string, newStatus: string | null) => void;
  onUpdatePrice: (biddingItemId: string, bidId: string, price: number | null) => void;
  onUploadProposal: (biddingItemId: string, bidId: string, files: File[]) => void;
  onDeleteAllProposals: (biddingItemId: string, bidId: string) => void;
  onDeleteCompany: (biddingItemId: string, bidId: string) => void;
  onSendEmail: (biddingItemId: string, companyId: string) => void;
  isReadOnly?: boolean;
  projectAddress?: string;
  selectedCompanies?: Set<string>;
  onCompanyCheckboxChange?: (companyId: string, checked: boolean) => void;
  onSelectAllCompanies?: (biddingItemId: string, checked: boolean) => void;
}

export function BidPackageDetailsModal({
  open,
  onOpenChange,
  item,
  costCode,
  onToggleBidStatus,
  onUpdatePrice,
  onUploadProposal,
  onDeleteAllProposals,
  onDeleteCompany,
  onSendEmail,
  isReadOnly = false,
  projectAddress,
  selectedCompanies,
  onCompanyCheckboxChange,
  onSelectAllCompanies
}: BidPackageDetailsModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span className="text-xl font-semibold">
                {costCode?.code} - {costCode?.name}
              </span>
            </div>
          </DialogTitle>
          <div className="flex gap-6 text-sm text-muted-foreground mt-2">
            {item.due_date && (
              <div>
                <span className="font-medium">Due Date:</span>{' '}
                {format(new Date(item.due_date), 'MMM dd, yyyy')}
              </div>
            )}
            {item.reminder_date && (
              <div>
                <span className="font-medium">Reminder:</span>{' '}
                {format(new Date(item.reminder_date), 'MMM dd, yyyy')}
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <div className="border rounded-lg">
            <table className="w-full">
              <tbody>
                <BiddingCompanyList
                  biddingItemId={item.id}
                  companies={item.project_bids || []}
                  onToggleBidStatus={onToggleBidStatus}
                  onUpdatePrice={onUpdatePrice}
                  onUploadProposal={onUploadProposal}
                  onDeleteAllProposals={onDeleteAllProposals}
                  onDeleteCompany={onDeleteCompany}
                  onSendEmail={onSendEmail}
                  isReadOnly={isReadOnly}
                  projectAddress={projectAddress}
                  projectId={item.project_id}
                  costCodeId={item.cost_code_id}
                  selectedCompanies={selectedCompanies}
                  onCompanyCheckboxChange={onCompanyCheckboxChange}
                  onSelectAllCompanies={onSelectAllCompanies}
                />
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}