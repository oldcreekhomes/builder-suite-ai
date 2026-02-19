import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getFileIcon, getFileIconColor, getCleanFileName } from '../bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePOMutations } from '@/hooks/usePOMutations';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { useBiddingCompanyMutations } from '@/hooks/useBiddingCompanyMutations';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | 'submitted' | null;
  price: number | null;
  proposals: string[] | null;
  companies: Company;
}

interface ConfirmPODialogProps {
  isOpen: boolean;
  onClose: () => void;
  biddingCompany: BiddingCompany | null;
  onConfirm: () => void;
  bidPackageId: string;
  projectAddress: string;
  projectId: string;
  costCodeId: string;
  mode?: 'send' | 'resend';
}

export function ConfirmPODialog({
  isOpen,
  onClose,
  biddingCompany,
  onConfirm,
  bidPackageId,
  projectAddress,
  projectId,
  costCodeId,
  mode = 'send'
}: ConfirmPODialogProps) {
  const { createPOSendEmailAndUpdateStatus, resendPOEmail, isLoading } = usePOMutations(projectId);
  const { profile } = useUserProfile();
  const { openProposalFile } = useUniversalFilePreviewContext();
  const { deleteIndividualProposal } = useBiddingCompanyMutations(projectId);
  const [customMessage, setCustomMessage] = useState('');
  const [costCodeData, setCostCodeData] = useState<{code: string, name: string} | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Fetch cost code data when dialog opens
  useEffect(() => {
    if (isOpen && costCodeId) {
      const fetchCostCode = async () => {
        const { data, error } = await supabase
          .from('cost_codes')
          .select('code, name')
          .eq('id', costCodeId)
          .single();
        
        if (!error && data) {
          setCostCodeData(data);
        }
      };
      
      fetchCostCode();
    }
  }, [isOpen, costCodeId]);

  const handleConfirm = async () => {
    if (!biddingCompany) return;

    try {
      if (mode === 'resend') {
        await resendPOEmail.mutateAsync({
          companyId: biddingCompany.company_id,
          costCodeId: costCodeId,
          totalAmount: biddingCompany.price || 0,
          biddingCompany: biddingCompany,
          bidPackageId: bidPackageId,
          customMessage: customMessage.trim() || undefined
        });
      } else {
        await createPOSendEmailAndUpdateStatus.mutateAsync({
          companyId: biddingCompany.company_id,
          costCodeId: costCodeId,
          totalAmount: biddingCompany.price || 0,
          biddingCompany: biddingCompany,
          bidPackageId: bidPackageId,
          customMessage: customMessage.trim() || undefined
        });
      }
      
      onConfirm();
      onClose();
      setCustomMessage(''); // Reset custom message after successful send
    } catch (error) {
      console.error(`Error ${mode === 'resend' ? 'resending' : 'creating'} PO and sending email:`, error);
      // Error is already handled in the mutation
    }
  };

  const handleCancel = () => {
    setCustomMessage(''); // Reset custom message on cancel
    onClose();
  };

  const handleFilePreview = (fileName: string) => {
    openProposalFile(fileName);
  };

  if (!biddingCompany) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'resend' ? 'Resend PO' : 'Confirm PO'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Company:</label>
            <p className="text-sm font-semibold">{biddingCompany.companies.company_name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Cost Code:</label>
            <p className="text-sm font-semibold">
              {costCodeData ? `${costCodeData.code}: ${costCodeData.name}` : 'Loading...'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Amount:</label>
            <p className="text-sm font-semibold">
              {biddingCompany.price ? `$${Number(biddingCompany.price).toLocaleString()}` : 'N/A'}
            </p>
          </div>

          <div>
            <label htmlFor="custom-message" className="text-sm font-medium text-muted-foreground">Custom Message (Optional)</label>
            <Textarea
              id="custom-message"
              placeholder="Add a custom message to include in the email..."
              className="w-full mt-1 resize-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black"
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </div>

          {biddingCompany.proposals && biddingCompany.proposals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Attached Proposals:</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {biddingCompany.proposals.map((fileName, index) => {
                  const IconComponent = getFileIcon(fileName);
                  const iconColor = getFileIconColor(fileName);
                  const cleanName = getCleanFileName(fileName);
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="relative">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleFilePreview(fileName)}
                              className="flex items-center justify-center p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            >
                              <IconComponent className={`h-6 w-6 ${iconColor}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{cleanName}</p>
                          </TooltipContent>
                        </Tooltip>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(fileName);
                          }}
                          className="absolute -top-1 -right-1 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center"
                          title="Delete file"
                          type="button"
                        >
                          <span className="text-xs font-bold leading-none">×</span>
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[60px] text-center mt-1">
                        {cleanName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!biddingCompany.proposals || biddingCompany.proposals.length === 0) && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Attached Proposals:</label>
              <p className="text-sm text-muted-foreground mt-1">No proposals attached</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? "Sending..." : mode === 'resend' ? "Resend PO" : "Send PO"}
          </Button>
        </div>

        <DeleteConfirmationDialog
          open={!!fileToDelete}
          onOpenChange={(open) => !open && setFileToDelete(null)}
          title="Delete Proposal File"
          description={`Are you sure you want to delete "${fileToDelete ? getCleanFileName(fileToDelete) : ''}"? This action cannot be undone.`}
          onConfirm={() => {
            if (fileToDelete && biddingCompany) {
              deleteIndividualProposal('', biddingCompany.id, fileToDelete);
              setFileToDelete(null);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
