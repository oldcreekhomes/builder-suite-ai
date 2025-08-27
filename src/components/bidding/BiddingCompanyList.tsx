
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
  companies: Company;
}

interface BiddingCompanyListProps {
  biddingItemId: string;
  companies: BiddingCompany[];
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  onUpdatePrice: (biddingItemId: string, companyId: string, price: number | null) => void;
  onUploadProposal: (biddingItemId: string, companyId: string, files: File[]) => void;
  onDeleteAllProposals: (biddingItemId: string, companyId: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  onSendEmail?: (biddingItemId: string, companyId: string) => void;
  isReadOnly?: boolean;
  projectAddress?: string;
  projectId: string;
  costCodeId: string;
}

export function BiddingCompanyList({ 
  biddingItemId, 
  companies, 
  onToggleBidStatus, 
  onUpdatePrice,
  onUploadProposal,
  onDeleteAllProposals,
  onDeleteCompany,
  onSendEmail,
  isReadOnly = false,
  projectAddress,
  projectId,
  costCodeId
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
        <TableCell colSpan={7} className="text-sm text-gray-500 italic text-center py-4">
          No companies associated with this cost code
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {/* Company header row */}
      <TableRow className="bg-gray-100">
        <TableCell className="w-12 py-2"></TableCell>
        <TableCell className="font-bold py-2 text-sm pl-8">Company</TableCell>
        <TableCell className="font-bold py-2 text-sm">Will Bid</TableCell>
        <TableCell className="font-bold py-2 text-sm">Price</TableCell>
        <TableCell className="font-bold py-2 text-sm">Proposals</TableCell>
        <TableCell className="font-bold py-2 text-sm">Actions</TableCell>
        <TableCell className="font-bold py-2 text-sm">Status</TableCell>
      </TableRow>
      
      {companies.map((biddingCompany) => (
        <BiddingCompanyRow
          key={biddingCompany.id}
          biddingItemId={biddingItemId}
          biddingCompany={biddingCompany}
          localPrice={localPrices[biddingCompany.company_id] || ''}
          onBidStatusChange={handleBidStatusChange}
          onPriceChange={handlePriceChange}
          onPriceBlur={handlePriceBlur}
          onFileUpload={handleFileUpload}
          onDeleteAllFiles={handleDeleteAllFiles}
          onDeleteCompany={onDeleteCompany}
          onSendEmail={onSendEmail ? (companyId) => onSendEmail(biddingItemId, companyId) : undefined}
          isReadOnly={isReadOnly}
          bidPackageId={biddingItemId}
          projectAddress={projectAddress || ''}
          projectId={projectId}
          costCodeId={costCodeId}
        />
      ))}
    </>
  );
}
