
import React, { useState } from 'react';
import { BidPackageDetailsModal } from './BidPackageDetailsModal';
import { SendBidPackageModal } from './SendBidPackageModal';
import { SendSingleCompanyEmailModal } from './SendSingleCompanyEmailModal';
import { SendTestEmailModal } from './SendTestEmailModal';
import { AddCompaniesToBidPackageModal } from './AddCompaniesToBidPackageModal';
import { BiddingTableRowContent } from './components/BiddingTableRowContent';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowProps {
  item: any; // Project bidding item with cost_codes relation and companies
  onDelete: (itemId: string) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateDueDate: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications: (itemId: string, specifications: string) => void;
  onToggleBidStatus: (biddingItemId: string, bidId: string, newStatus: string | null) => void;
  onUpdatePrice: (biddingItemId: string, bidId: string, price: number | null) => void;
  onUploadProposal: (biddingItemId: string, bidId: string, files: File[]) => void;
  onDeleteAllProposals: (biddingItemId: string, bidId: string) => void;
  onDeleteCompany: (biddingItemId: string, bidId: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  isReadOnly?: boolean;
  isCompanyReadOnly?: boolean;
  projectAddress?: string;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
  selectedCompanies?: Set<string>;
  onCompanyCheckboxChange?: (companyId: string, checked: boolean) => void;
  onSelectAllCompanies?: (biddingItemId: string, checked: boolean) => void;
}

export function BiddingTableRow({
  item,
  onDelete,
  onUpdateStatus,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUpdateSpecifications,
  onToggleBidStatus,
  onUpdatePrice,
  onUploadProposal,
  onDeleteAllProposals,
  onDeleteCompany,
  formatUnitOfMeasure,
  isSelected,
  onCheckboxChange,
  isDeleting = false,
  isReadOnly = false,
  isCompanyReadOnly = false,
  projectAddress,
  onFileUpload,
  onDeleteIndividualFile,
  selectedCompanies,
  onCompanyCheckboxChange,
  onSelectAllCompanies
}: BiddingTableRowProps) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSingleCompanyModal, setShowSingleCompanyModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [showAddCompaniesModal, setShowAddCompaniesModal] = useState(false);
  const [showBidPackageModal, setShowBidPackageModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const costCode = item.cost_codes as CostCode;

  const handleSendEmailToCompany = (biddingItemId: string, companyId: string) => {
    setSelectedCompanyId(companyId);
    setShowSingleCompanyModal(true);
  };


  return (
    <>
      <BiddingTableRowContent
        item={item}
        costCode={costCode}
        isSelected={isSelected}
        isDeleting={isDeleting}
        isReadOnly={isReadOnly}
        onRowClick={() => setShowBidPackageModal(true)}
        onCheckboxChange={onCheckboxChange}
        onUpdateStatus={onUpdateStatus}
        onUpdateDueDate={onUpdateDueDate}
        onUpdateReminderDate={onUpdateReminderDate}
        onUpdateSpecifications={onUpdateSpecifications}
        onDelete={onDelete}
        onSendClick={() => setShowSendModal(true)}
        onTestEmailClick={() => setShowTestEmailModal(true)}
        onAddCompaniesClick={() => setShowAddCompaniesModal(true)}
        onFileUpload={onFileUpload}
        onDeleteIndividualFile={onDeleteIndividualFile}
      />
      
      <SendBidPackageModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        bidPackage={item}
      />
      
      <SendSingleCompanyEmailModal
        open={showSingleCompanyModal}
        onOpenChange={setShowSingleCompanyModal}
        bidPackage={item}
        companyId={selectedCompanyId}
      />
      
      <SendTestEmailModal
        open={showTestEmailModal}
        onOpenChange={setShowTestEmailModal}
        bidPackage={item}
        companyId={selectedCompanyId}
      />

      <BidPackageDetailsModal
        open={showBidPackageModal}
        onOpenChange={setShowBidPackageModal}
        item={item}
        costCode={costCode}
        // Bid package operations
        onUpdateStatus={onUpdateStatus}
        onUpdateDueDate={onUpdateDueDate}
        onUpdateReminderDate={onUpdateReminderDate}
        onUpdateSpecifications={onUpdateSpecifications}
        onDelete={onDelete}
        onFileUpload={onFileUpload}
        onDeleteIndividualFile={onDeleteIndividualFile}
        onSendClick={() => setShowSendModal(true)}
        onTestEmailClick={() => setShowTestEmailModal(true)}
        onAddCompaniesClick={() => setShowAddCompaniesModal(true)}
        // Company operations
        onToggleBidStatus={onToggleBidStatus}
        onUpdatePrice={onUpdatePrice}
        onUploadProposal={onUploadProposal}
        onDeleteAllProposals={onDeleteAllProposals}
        onDeleteCompany={onDeleteCompany}
        onSendEmail={handleSendEmailToCompany}
        isReadOnly={isCompanyReadOnly}
        projectAddress={projectAddress}
        selectedCompanies={selectedCompanies}
        onCompanyCheckboxChange={onCompanyCheckboxChange}
        onSelectAllCompanies={onSelectAllCompanies}
      />
      
      <AddCompaniesToBidPackageModal
        open={showAddCompaniesModal}
        onOpenChange={setShowAddCompaniesModal}
        bidPackageId={item.id}
        costCodeId={item.cost_code_id}
        projectId={item.project_id}
        existingCompanyIds={(item.project_bids || []).map((bid: any) => bid.company_id)}
      />
    </>
  );
}
