
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Upload, Paperclip, Send } from 'lucide-react';
import { BiddingCompanyList } from './BiddingCompanyList';
import { BiddingDatePicker } from './components/BiddingDatePicker';
import { EditBiddingSpecificationsModal } from './EditBiddingSpecificationsModal';
import { SendBidPackageModal } from './SendBidPackageModal';
import { getFileIcon, getFileIconColor } from './utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BiddingTableRowProps {
  item: any; // Project bidding item with cost_codes relation and companies
  onDelete: (itemId: string) => void;
  onUpdateStatus: (itemId: string, status: string) => void;
  onUpdateDueDate: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications: (itemId: string, specifications: string) => void;
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  onUpdatePrice: (biddingItemId: string, companyId: string, price: number | null) => void;
  onUploadProposal: (biddingItemId: string, companyId: string, files: File[]) => void;
  onDeleteAllProposals: (biddingItemId: string, companyId: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  formatUnitOfMeasure: (unit: string | null) => string;
  isSelected: boolean;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  isDeleting?: boolean;
  isReadOnly?: boolean;
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
  isReadOnly = false
}: BiddingTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const costCode = item.cost_codes as CostCode;

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Handle bid package file upload - we'll need to implement this
        console.log('Bid package files:', files);
      }
    };
    input.click();
  };

  const handleFilePreview = async (fileName: string) => {
    try {
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(`specifications/${fileName}`);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  return (
    <>
      <TableRow className={`h-8 ${isSelected ? 'bg-blue-50' : ''}`}>
        <TableCell className="w-12 py-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onCheckboxChange(item.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="font-medium py-1 text-sm">
          <div className="flex items-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:bg-gray-100 rounded mr-2"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {costCode?.code} - {costCode?.name}
          </div>
        </TableCell>
        <TableCell className="py-1">
          <Select 
            value={item.status || 'draft'} 
            onValueChange={(value) => onUpdateStatus(item.id, value)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-20 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-md z-50">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-1 w-32">
          <BiddingDatePicker
            value={item.due_date}
            onChange={(biddingItemId, companyId, date) => onUpdateDueDate(biddingItemId, date)}
            placeholder="mm/dd/yyyy"
            disabled={isReadOnly}
            companyId=""
            biddingItemId={item.id}
            field="due_date"
          />
        </TableCell>
        <TableCell className="py-1 w-32">
          <BiddingDatePicker
            value={item.reminder_date}
            onChange={(biddingItemId, companyId, date) => onUpdateReminderDate(biddingItemId, date)}
            placeholder="mm/dd/yyyy"
            disabled={isReadOnly}
            companyId=""
            biddingItemId={item.id}
            field="reminder_date"
            dueDate={item.due_date}
          />
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center justify-center">
            {item.specifications && item.specifications.trim() !== '' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSpecsModal(true)}
                className="h-8 w-8 p-0"
                title="View/Edit Specifications"
                disabled={isReadOnly}
              >
                <Paperclip className="h-4 w-4 text-blue-600" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSpecsModal(true)}
                className="h-8 text-xs px-2"
                disabled={isReadOnly}
              >
                Add Specs
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center space-x-2">
            {/* Show specification files if they exist */}
            {item.files && item.files.length > 0 ? (
              <>
                <div className="flex items-center space-x-1">
                  {item.files.map((fileName: string, index: number) => {
                    const IconComponent = getFileIcon(fileName);
                    const iconColorClass = getFileIconColor(fileName);
                    return (
                      <button
                        key={index}
                        onClick={() => handleFilePreview(fileName)}
                        className={`${iconColorClass} transition-colors p-1`}
                        title={fileName}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
                {!isReadOnly && (
                  <DeleteButton
                    onDelete={handleFileUpload} // This would be delete all files function
                    title="Delete All Files"
                    description="Are you sure you want to delete all files? This action cannot be undone."
                    size="sm"
                    variant="ghost"
                    showIcon={true}
                  />
                )}
              </>
            ) : (
              !isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFileUpload}
                  className="h-8 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Files
                </Button>
              )
            )}
          </div>
        </TableCell>
        <TableCell className="py-1">
          <div className="flex items-center justify-end space-x-2">            
            {!isReadOnly && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Send Bid Package"
                  onClick={() => setShowSendModal(true)}
                >
                  <Send className="h-4 w-4 text-black" />
                </Button>
                <DeleteButton
                  onDelete={() => onDelete(item.id)}
                  title="Delete Bidding Item"
                  description={`Are you sure you want to delete the bidding item "${costCode?.code} - ${costCode?.name}"? This action cannot be undone.`}
                  size="sm"
                  variant="ghost"
                  isLoading={isDeleting}
                  showIcon={true}
                />
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      
      {isExpanded && (
        <BiddingCompanyList
          biddingItemId={item.id}
          companies={item.project_bid_package_companies || []}
          onToggleBidStatus={onToggleBidStatus}
          onUpdatePrice={onUpdatePrice}
          onUploadProposal={onUploadProposal}
          onDeleteAllProposals={onDeleteAllProposals}
          onDeleteCompany={onDeleteCompany}
          isReadOnly={isReadOnly}
        />
      )}
      
      <EditBiddingSpecificationsModal
        open={showSpecsModal}
        onOpenChange={setShowSpecsModal}
        costCodeName={costCode?.name || ''}
        costCodeCode={costCode?.code || ''}
        specifications={item.specifications || ''}
        onUpdateSpecifications={async (specifications) => {
          await onUpdateSpecifications(item.id, specifications);
        }}
      />
      
      <SendBidPackageModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        bidPackage={item}
      />
    </>
  );
}
