
import React, { useState } from 'react';
import { BiddingCompanyList } from './BiddingCompanyList';
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
  onDeleteFiles?: (itemId: string) => void;
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
  onDeleteFiles,
  selectedCompanies,
  onCompanyCheckboxChange,
  onSelectAllCompanies
}: BiddingTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSingleCompanyModal, setShowSingleCompanyModal] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [showAddCompaniesModal, setShowAddCompaniesModal] = useState(false);
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
        isExpanded={isExpanded}
        isSelected={isSelected}
        isDeleting={isDeleting}
        isReadOnly={isReadOnly}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
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
        onDeleteFiles={onDeleteFiles}
      />
      
      {isExpanded && (
        <BiddingCompanyList
          biddingItemId={item.id}
          companies={item.project_bids || []}
          onToggleBidStatus={onToggleBidStatus}
          onUpdatePrice={onUpdatePrice}
          onUploadProposal={onUploadProposal}
          onDeleteAllProposals={onDeleteAllProposals}
          onDeleteCompany={onDeleteCompany}
          onSendEmail={handleSendEmailToCompany}
          isReadOnly={isCompanyReadOnly}
          projectAddress={projectAddress}
          projectId={item.project_id}
          costCodeId={item.cost_code_id}
          selectedCompanies={selectedCompanies}
          onCompanyCheckboxChange={onCompanyCheckboxChange}
          onSelectAllCompanies={onSelectAllCompanies}
        />
      )}
      
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
