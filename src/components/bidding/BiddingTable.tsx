
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, XCircle, Settings } from 'lucide-react';
import { AddBiddingModal } from './AddBiddingModal';
import { GlobalBiddingSettingsModal } from './GlobalBiddingSettingsModal';
import { BiddingTableHeader } from './BiddingTableHeader';
import { BiddingGroupHeader } from './BiddingGroupHeader';
import { BiddingTableRow } from './BiddingTableRow';
import { BiddingTableFooter } from './BiddingTableFooter';

import { BulkActionBar } from '@/components/files/components/BulkActionBar';
import { useBiddingData, useAllBiddingData } from '@/hooks/useBiddingData';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useBiddingMutations } from '@/hooks/useBiddingMutations';
import { useBiddingCompanyMutations } from '@/hooks/useBiddingCompanyMutations';
import { useGlobalBiddingSettings } from '@/hooks/useGlobalBiddingSettings';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';

interface BiddingTableProps {
  projectId: string;
  projectAddress?: string;
  status: 'draft' | 'sent' | 'closed';
}

export function BiddingTable({ projectId, projectAddress, status }: BiddingTableProps) {
  const [showAddBiddingModal, setShowAddBiddingModal] = useState(false);
  const [showGlobalSettingsModal, setShowGlobalSettingsModal] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  
  
  const { biddingItems, groupedBiddingItems } = useBiddingData(projectId, status);
  const { data: allBiddingData } = useAllBiddingData(projectId);
  
  // Get ALL existing cost code IDs across all statuses to prevent duplicates in modal
  const allExistingCostCodeIds = React.useMemo(() => {
    if (!allBiddingData) return new Set<string>();
    return new Set<string>(allBiddingData.map(item => item.cost_code_id).filter(Boolean));
  }, [allBiddingData]);
  
  // Memoize the array conversion to prevent infinite re-renders
  const existingCostCodeIdsArray = React.useMemo(() => {
    return Array.from(allExistingCostCodeIds);
  }, [allExistingCostCodeIds]);
  
  const {
    expandedGroups,
    selectedItems,
    handleGroupToggle,
    handleGroupCheckboxChange,
    handleItemCheckboxChange,
    isGroupSelected,
    isGroupPartiallySelected,
    removeDeletedItemsFromSelection,
    removeGroupFromExpanded
  } = useBudgetGroups(groupedBiddingItems);
  
  const { deletingGroups, deletingItems, uploadingFiles, handleDeleteItem, handleDeleteGroup, handleUpdateStatus, handleUpdateDueDate, handleUpdateReminderDate, handleUpdateSpecifications, handleFileUpload, handleDeleteIndividualFile, cancelUpload, removeUpload } = useBiddingMutations(projectId);
  const { toggleBidStatus, updatePrice, uploadProposal, deleteIndividualProposal, deleteAllProposals, deleteCompany } = useBiddingCompanyMutations(projectId);
  const { applyGlobalSettings, isApplying, progress } = useGlobalBiddingSettings(projectId);

  // Company selection handlers for modal use
  const handleCompanyCheckboxChange = (companyId: string, checked: boolean) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(companyId);
      } else {
        newSet.delete(companyId);
      }
      return newSet;
    });
  };

  const handleSelectAllCompanies = (biddingItemId: string, checked: boolean) => {
    const item = biddingItems.find(i => i.id === biddingItemId);
    if (!item) return;

    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      const companyIds = (item.project_bids || []).map((bid: any) => bid.id);
      
      if (checked) {
        companyIds.forEach(id => newSet.add(id));
      } else {
        companyIds.forEach(id => newSet.delete(id));
      }
      return newSet;
    });
  };

  const onBulkDeleteCompanies = () => {
    // Delete each selected company
    selectedCompanies.forEach(companyId => {
      // Find the bidding item and company for this companyId
      for (const item of biddingItems) {
        const company = (item.project_bids || []).find((bid: any) => bid.id === companyId);
        if (company) {
          deleteCompany(item.id, companyId);
          break;
        }
      }
    });
    
    // Clear selections after deletion
    setSelectedCompanies(new Set());
  };


  const onDeleteGroup = (group: string) => {
    const groupItems = groupedBiddingItems[group] || [];
    handleDeleteGroup(group, groupItems);
    
    // Clean up UI state after deletion
    removeDeletedItemsFromSelection(groupItems);
    removeGroupFromExpanded(group);
  };

  const onDeleteItem = (itemId: string) => {
    handleDeleteItem(itemId);
    
    // Clean up UI state after deletion
    const newSelectedItems = new Set(selectedItems);
    newSelectedItems.delete(itemId);
  };

  const onBulkDelete = () => {
    // Get all selected items from the bidding data
    const selectedBiddingItems = biddingItems.filter(item => selectedItems.has(item.id));
    
    // Delete each selected item
    selectedBiddingItems.forEach(item => {
      handleDeleteItem(item.id);
    });
    
    // Clear selections after deletion
    removeDeletedItemsFromSelection(selectedBiddingItems);
  };

  const onGroupCheckboxChange = (group: string, checked: boolean) => {
    const groupItems = groupedBiddingItems[group] || [];
    handleGroupCheckboxChange(group, checked, groupItems);
  };

  const getEmptyStateMessage = () => {
    switch (status) {
      case 'draft':
        return 'No draft bid packages yet.';
      case 'sent':
        return 'No sent bid packages yet.';
      case 'closed':
        return 'No closed bid packages yet.';
      default:
        return 'No bid packages found.';
    }
  };

  const getLoadButtonText = () => {
    return status === 'draft' ? 'Load Bid Packages' : 'View Bid Packages';
  };

  const isReadOnly = status === 'closed';

  const selectedCount = selectedItems.size;
  const isDeletingSelected = Array.from(selectedItems).some(id => deletingItems.has(id));

  return (
    <div className="space-y-4 relative">
      {/* Loading overlay during global settings update */}
      {isApplying && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg shadow-lg border flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="font-medium">Updating all draft bid packages...</span>
          </div>
        </div>
      )}

      {status === 'draft' && (
        <div className="flex items-center justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowGlobalSettingsModal(true)}
            disabled={biddingItems.length === 0}
          >
            <Settings className="mr-2 h-4 w-4" />
            Global Settings
          </Button>
          <Button onClick={() => setShowAddBiddingModal(true)}>
            {getLoadButtonText()}
          </Button>
        </div>
      )}

      {selectedCount > 0 && status === 'draft' && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedFolderCount={0}
          onBulkDelete={onBulkDelete}
          isDeleting={isDeletingSelected}
        />
      )}

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-auto">
              {uploadingFiles.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Progress value={upload.progress} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground min-w-0">
                        {upload.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {upload.uploading ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelUpload(upload.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        title="Cancel upload"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(upload.id)}
                        className="h-6 w-6 p-0"
                        title="Remove from list"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 50MB
            </p>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <BiddingTableHeader />
          <TableBody>
            {biddingItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {getEmptyStateMessage()}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Object.entries(groupedBiddingItems).map(([group, items]) => [
                  <BiddingGroupHeader
                    key={`header-${group}`}
                    group={group}
                    isExpanded={expandedGroups.has(group)}
                    onToggle={handleGroupToggle}
                    isSelected={isGroupSelected(items)}
                    isPartiallySelected={isGroupPartiallySelected(items)}
                    onCheckboxChange={onGroupCheckboxChange}
                    onEditGroup={() => {}}
                    onDeleteGroup={onDeleteGroup}
                    isDeleting={deletingGroups.has(group)}
                    hasChildren={items.length > 0}
                  />,
                  
                  ...(expandedGroups.has(group) ? items.map((item) => (
                     <BiddingTableRow
                       key={item.id}
                       item={item}
                       onDelete={onDeleteItem}
                       onUpdateStatus={handleUpdateStatus}
                       onUpdateDueDate={handleUpdateDueDate}
                       onUpdateReminderDate={handleUpdateReminderDate}
                       onUpdateSpecifications={handleUpdateSpecifications}
                       onToggleBidStatus={toggleBidStatus}
                       onUpdatePrice={updatePrice}
                       onUploadProposal={uploadProposal}
                       onDeleteIndividualProposal={deleteIndividualProposal}
                       onDeleteAllProposals={deleteAllProposals}
                       onDeleteCompany={deleteCompany}
                       formatUnitOfMeasure={formatUnitOfMeasure}
                       isSelected={selectedItems.has(item.id)}
                       onCheckboxChange={handleItemCheckboxChange}
                       isDeleting={deletingItems.has(item.id)}
                       isReadOnly={isReadOnly}
                       isCompanyReadOnly={status === 'closed'}
                       projectAddress={projectAddress}
                       onFileUpload={handleFileUpload}
                       onDeleteIndividualFile={handleDeleteIndividualFile}
                       selectedCompanies={selectedCompanies}
                       onCompanyCheckboxChange={handleCompanyCheckboxChange}
                       onSelectAllCompanies={handleSelectAllCompanies}
                       onBulkDeleteCompanies={onBulkDeleteCompanies}
                       isDeletingCompanies={false}
                     />
                  )) : [])
                ]).flat()}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <BiddingTableFooter biddingItems={biddingItems} />

      {status === 'draft' && (
        <>
          <AddBiddingModal
            projectId={projectId}
            open={showAddBiddingModal}
            onOpenChange={setShowAddBiddingModal}
            existingCostCodeIds={existingCostCodeIdsArray}
          />
          <GlobalBiddingSettingsModal
            projectId={projectId}
            open={showGlobalSettingsModal}
            onOpenChange={(open) => {
              // Only allow closing if not currently applying settings
              if (!isApplying) {
                setShowGlobalSettingsModal(open);
              }
            }}
            onApplySettings={(settings) => {
              applyGlobalSettings(settings);
              // Close modal after successful completion
              setTimeout(() => {
                if (!isApplying) {
                  setShowGlobalSettingsModal(false);
                }
              }, 1000);
            }}
            isLoading={isApplying}
            progress={progress}
          />
        </>
      )}
    </div>
  );
}
