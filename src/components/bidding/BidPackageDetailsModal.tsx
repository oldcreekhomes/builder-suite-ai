import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BiddingCompanyList } from './BiddingCompanyList';
import { BiddingDatePicker } from './components/BiddingDatePicker';
import { BiddingTableRowSpecs } from './components/BiddingTableRowSpecs';
import { BiddingTableRowFiles } from './components/BiddingTableRowFiles';
import { BiddingTableRowActions } from './components/BiddingTableRowActions';
import { BulkActionBar } from '@/components/files/components/BulkActionBar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useDistanceFilter } from '@/hooks/useDistanceFilter';
import { DistanceFilterBar } from './components/DistanceFilterBar';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BidPackageDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any; // Project bidding item with cost_codes relation and companies
  costCode: CostCode;
  // Bid package operations
  onUpdateStatus?: (itemId: string, status: string) => void;
  onUpdateDueDate?: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate?: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications?: (itemId: string, specifications: string) => void;
  onDelete?: (itemId: string) => void;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
  onSendClick?: () => void;
  onTestEmailClick?: () => void;
  onAddCompaniesClick?: () => void;
  // Company operations
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
  onBulkDeleteCompanies?: (biddingItemId: string, companyIds: string[]) => void;
  isDeletingCompanies?: boolean;
}

export function BidPackageDetailsModal({
  open,
  onOpenChange,
  item,
  costCode,
  // Bid package operations
  onUpdateStatus,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUpdateSpecifications,
  onDelete,
  onFileUpload,
  onDeleteIndividualFile,
  onSendClick,
  onTestEmailClick,
  onAddCompaniesClick,
  // Company operations
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
  onSelectAllCompanies,
  onBulkDeleteCompanies,
  isDeletingCompanies = false
}: BidPackageDetailsModalProps) {
  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [distanceRadius, setDistanceRadius] = useState(20);

  const distanceFilter = useDistanceFilter({
    enabled: distanceFilterEnabled,
    radiusMiles: distanceRadius,
    projectAddress: projectAddress || '',
    companies: item.project_bids || []
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDeleteCompanies && selectedCompanies) {
      const selectedIds = Array.from(selectedCompanies);
      onBulkDeleteCompanies(item.id, selectedIds);
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
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Bid Package Management Section */}
          <div className="border rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Due Date</th>
                  <th className="text-left p-3 text-sm font-medium">Reminder</th>
                  <th className="text-left p-3 text-sm font-medium">Specifications</th>
                  <th className="text-left p-3 text-sm font-medium">Files</th>
                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3">
                    <Select
                      value={item.status || 'draft'}
                      onValueChange={(value) => onUpdateStatus?.(item.id, value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <BiddingDatePicker
                      value={item.due_date}
                      onChange={(biddingItemId, companyId, date) => onUpdateDueDate?.(biddingItemId, date)}
                      placeholder="Due Date"
                      disabled={isReadOnly}
                      companyId=""
                      biddingItemId={item.id}
                      field="due_date"
                    />
                  </td>
                  <td className="p-3">
                    <BiddingDatePicker
                      value={item.reminder_date}
                      onChange={(biddingItemId, companyId, date) => onUpdateReminderDate?.(biddingItemId, date)}
                      placeholder="Reminder"
                      disabled={isReadOnly}
                      companyId=""
                      biddingItemId={item.id}
                      field="reminder_date"
                      dueDate={item.due_date}
                    />
                  </td>
                  <BiddingTableRowSpecs
                    item={item}
                    costCode={costCode}
                    onUpdateSpecifications={(itemId, specs) => onUpdateSpecifications?.(itemId, specs)}
                    isReadOnly={isReadOnly}
                  />
                  <BiddingTableRowFiles
                    item={item}
                    onFileUpload={(itemId, files) => onFileUpload?.(itemId, files)}
                    onDeleteIndividualFile={(itemId, fileName) => onDeleteIndividualFile?.(itemId, fileName)}
                    isReadOnly={isReadOnly}
                  />
                  <BiddingTableRowActions
                    item={item}
                    costCode={costCode}
                    onDelete={(itemId) => onDelete?.(itemId)}
                    onSendClick={() => onSendClick?.()}
                    onTestEmailClick={() => onTestEmailClick?.()}
                    onAddCompaniesClick={() => onAddCompaniesClick?.()}
                    isDeleting={false}
                    isReadOnly={isReadOnly}
                  />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Distance Filter Bar */}
          <DistanceFilterBar
            enabled={distanceFilterEnabled}
            onEnabledChange={setDistanceFilterEnabled}
            radiusMiles={distanceRadius}
            onRadiusChange={setDistanceRadius}
            projectAddress={projectAddress}
            companies={item.project_bids || []}
            isCalculating={distanceFilter.isCalculating}
            stats={distanceFilter.stats}
          />

          {/* Bulk Action Bar for Selected Companies */}
          {selectedCompanies && selectedCompanies.size > 0 && (
            <BulkActionBar
              selectedCount={selectedCompanies.size}
              selectedFolderCount={0}
              onBulkDelete={handleBulkDelete}
              isDeleting={isDeletingCompanies}
            />
          )}

          {/* Companies Section */}
          <div className="border rounded-lg">
            <table className="w-full">
              <tbody>
                <BiddingCompanyList
                  biddingItemId={item.id}
                  companies={distanceFilter.filteredCompanies}
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
                  getDistanceForCompany={distanceFilter.getDistanceForCompany}
                />
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}