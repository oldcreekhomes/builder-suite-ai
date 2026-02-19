import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { BiddingCompanyList } from './BiddingCompanyList';
import { BiddingDatePicker } from './components/BiddingDatePicker';
import { BiddingTableRowSpecs } from './components/BiddingTableRowSpecs';
import { BiddingTableRowFiles } from './components/BiddingTableRowFiles';
import { BiddingTableRowActions } from './components/BiddingTableRowActions';
import { BulkActionBar } from '@/components/files/components/BulkActionBar';
import { Badge } from '@/components/ui/badge';
import { X, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDistanceFilter } from '@/hooks/useDistanceFilter';
import { useBidPackagePO } from '@/hooks/useBidPackagePO';
import { CloseBidPackageDialog } from './components/CloseBidPackageDialog';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

interface BidPackageDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  costCode: CostCode;
  onUpdateStatus?: (itemId: string, status: string) => void;
  onUpdateDueDate?: (itemId: string, dueDate: string | null) => void;
  onUpdateReminderDate?: (itemId: string, reminderDate: string | null) => void;
  onUpdateSpecifications?: (itemId: string, specifications: string) => void;
  onDelete?: (itemId: string) => void;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
  onLinkProjectFiles?: (itemId: string, storagePaths: string[]) => void;
  onSendClick?: (filteredCompanyIds: string[]) => void;
  onTestEmailClick?: () => void;
  onAddCompaniesClick?: () => void;
  onCloseWithPO?: () => void;
  onToggleBidStatus: (biddingItemId: string, bidId: string, newStatus: string | null) => void;
  onUpdatePrice: (biddingItemId: string, bidId: string, price: number | null) => void;
  onUploadProposal: (biddingItemId: string, bidId: string, files: File[]) => void;
  onDeleteIndividualProposal: (biddingItemId: string, bidId: string, fileName: string) => void;
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
  uploadingFiles?: any[];
  cancelUpload?: (uploadId: string) => void;
  removeUpload?: (uploadId: string) => void;
}

export function BidPackageDetailsModal({
  open,
  onOpenChange,
  item,
  costCode,
  onUpdateStatus,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUpdateSpecifications,
  onDelete,
  onFileUpload,
  onDeleteIndividualFile,
  onLinkProjectFiles,
  onSendClick,
  onTestEmailClick,
  onAddCompaniesClick,
  onCloseWithPO,
  onToggleBidStatus,
  onUpdatePrice,
  onUploadProposal,
  onDeleteIndividualProposal,
  onDeleteAllProposals,
  onDeleteCompany,
  onSendEmail,
  isReadOnly = false,
  projectAddress,
  selectedCompanies,
  onCompanyCheckboxChange,
  onSelectAllCompanies,
  onBulkDeleteCompanies,
  isDeletingCompanies = false,
  uploadingFiles = [],
  cancelUpload,
  removeUpload
}: BidPackageDetailsModalProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [distanceRadius, setDistanceRadius] = useState(50);
  const { awardedPOs } = useBidPackagePO(isReadOnly ? item?.id : null);

  const handleStatusChange = (value: string) => {
    if (value === 'closed') {
      setShowCloseDialog(true);
    } else {
      onUpdateStatus?.(item.id, value);
    }
  };

  const handleJustClose = () => {
    onUpdateStatus?.(item.id, 'closed');
  };

  const handleCreatePO = () => {
    onCloseWithPO?.();
  };

  const distanceFilter = useDistanceFilter({
    enabled: true,
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

  const bidPackageUploads = uploadingFiles.filter(upload => upload.itemId === item.id);

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
          {/* Upload Progress for this Bid Package */}
          {bidPackageUploads.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Uploading Files</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-auto">
                  {bidPackageUploads.map((upload) => (
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
                            onClick={() => cancelUpload?.(upload.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            title="Cancel upload"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUpload?.(upload.id)}
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

          {/* Bid Package Management Section */}
          <div className="border rounded-lg">
            <Table containerClassName="relative w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent On</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reminder</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Select
                      value={item.status || 'draft'}
                      onValueChange={handleStatusChange}
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
                  </TableCell>
                  <TableCell className={cn("text-sm", !item.sent_on && "text-muted-foreground")}>
                    {item.sent_on ? format(new Date(item.sent_on), 'MM/dd/yyyy') : 'mm/dd/yyyy'}
                  </TableCell>
                  <TableCell>
                    <BiddingDatePicker
                      value={item.due_date}
                      onChange={(biddingItemId, companyId, date) => onUpdateDueDate?.(biddingItemId, date)}
                      placeholder="Due Date"
                      disabled={isReadOnly}
                      companyId=""
                      biddingItemId={item.id}
                      field="due_date"
                    />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <BiddingTableRowSpecs
                    item={item}
                    costCode={costCode}
                    onUpdateSpecifications={(itemId, specs) => onUpdateSpecifications?.(itemId, specs)}
                    isReadOnly={isReadOnly}
                  />
                  <BiddingTableRowFiles
                    item={item}
                    projectId={item.project_id}
                    onFileUpload={(itemId, files) => onFileUpload?.(itemId, files)}
                    onDeleteIndividualFile={(itemId, fileName) => onDeleteIndividualFile?.(itemId, fileName)}
                    onLinkProjectFiles={onLinkProjectFiles}
                    isReadOnly={isReadOnly}
                  />
                  <TableCell>
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <span className="text-xs font-medium">{distanceRadius} mi from job site</span>
                      <Slider
                        value={[distanceRadius]}
                        onValueChange={([value]) => setDistanceRadius(value)}
                        min={0}
                        max={75}
                        step={5}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Showing {distanceFilter.filteredCompanies.length} of {(item.project_bids || []).length} within {distanceRadius} mi
                      </span>
                    </div>
                  </TableCell>
                  <BiddingTableRowActions
                    item={item}
                    costCode={costCode}
                    onDelete={(itemId) => onDelete?.(itemId)}
                    onSendClick={() => {
                      const ids = distanceFilter.filteredCompanies.map((c: any) => c.company_id);
                      onSendClick?.(ids);
                    }}
                    onTestEmailClick={() => onTestEmailClick?.()}
                    onAddCompaniesClick={() => onAddCompaniesClick?.()}
                    isDeleting={false}
                    isReadOnly={isReadOnly}
                  />
                </TableRow>
              </TableBody>
            </Table>
          </div>

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
                  onDeleteIndividualProposal={onDeleteIndividualProposal}
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
                  awardedPOs={awardedPOs}
                />
              </tbody>
            </table>
          </div>
        </div>

        <CloseBidPackageDialog
          open={showCloseDialog}
          onOpenChange={setShowCloseDialog}
          costCodeName={`${costCode?.code} - ${costCode?.name}`}
          onJustClose={handleJustClose}
          onCreatePO={handleCreatePO}
        />
      </DialogContent>
    </Dialog>
  );
}
