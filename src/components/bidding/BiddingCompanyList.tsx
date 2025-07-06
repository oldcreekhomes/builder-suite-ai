
import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { BiddingCompanyRow } from './components/BiddingCompanyRow';

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
  due_date: string | null;
  reminder_date: string | null;
  companies: Company;
}

interface BiddingCompanyListProps {
  biddingItemId: string;
  companies: BiddingCompany[];
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  onUpdatePrice: (biddingItemId: string, companyId: string, price: number | null) => void;
  onUpdateDueDate: (biddingItemId: string, companyId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (biddingItemId: string, companyId: string, reminderDate: string | null) => void;
  onUploadProposal: (biddingItemId: string, companyId: string, files: File[]) => void;
  onDeleteAllProposals: (biddingItemId: string, companyId: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  isReadOnly?: boolean;
}

export function BiddingCompanyList({ 
  biddingItemId, 
  companies, 
  onToggleBidStatus, 
  onUpdatePrice,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUploadProposal,
  onDeleteAllProposals,
  onDeleteCompany,
  isReadOnly = false
}: BiddingCompanyListProps) {
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});

  // Initialize local prices from companies data
  useEffect(() => {
    const prices: Record<string, string> = {};
    companies.forEach(company => {
      prices[company.company_id] = company.price?.toString() || '';
    });
    setLocalPrices(prices);
  }, [companies]);
  
  const handleBidStatusChange = (companyId: string, newStatus: string) => {
    onToggleBidStatus(biddingItemId, companyId, newStatus);
  };

  const handleFileUpload = (companyId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        onUploadProposal(biddingItemId, companyId, files);
      }
    };
    input.click();
  };

  const handleDeleteAllFiles = (companyId: string) => {
    onDeleteAllProposals(biddingItemId, companyId);
  };

  const handlePriceChange = (companyId: string, value: string) => {
    // Update local state immediately for responsive UI
    setLocalPrices(prev => ({
      ...prev,
      [companyId]: value
    }));
  };

  const handlePriceBlur = (companyId: string, value: string) => {
    // Only save to database when user finishes editing
    const price = value === '' ? null : parseFloat(value);
    if (!isNaN(price) || price === null) {
      onUpdatePrice(biddingItemId, companyId, price);
    }
  };

  if (companies.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-sm text-gray-500 italic text-center py-4">
          No companies associated with this cost code
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {companies.map((biddingCompany) => (
        <BiddingCompanyRow
          key={biddingCompany.id}
          biddingItemId={biddingItemId}
          biddingCompany={biddingCompany}
          localPrice={localPrices[biddingCompany.company_id] || ''}
          onBidStatusChange={handleBidStatusChange}
          onPriceChange={handlePriceChange}
          onPriceBlur={handlePriceBlur}
          onUpdateDueDate={onUpdateDueDate}
          onUpdateReminderDate={onUpdateReminderDate}
          onFileUpload={handleFileUpload}
          onDeleteAllFiles={handleDeleteAllFiles}
          onDeleteCompany={onDeleteCompany}
          isReadOnly={isReadOnly}
        />
      ))}
    </>
  );
}
