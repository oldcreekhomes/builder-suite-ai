import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';

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

interface ConfirmPODialogProps {
  isOpen: boolean;
  onClose: () => void;
  biddingCompany: BiddingCompany | null;
  onConfirm: () => void;
}

export function ConfirmPODialog({
  isOpen,
  onClose,
  biddingCompany,
  onConfirm
}: ConfirmPODialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleFilePreview = async (fileName: string) => {
    try {
      const { data } = await supabase.storage
        .from('project_proposals')
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
    }
  };

  if (!biddingCompany) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm PO</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Company:</label>
            <p className="text-sm font-semibold">{biddingCompany.companies.company_name}</p>
          </div>

          {biddingCompany.proposals && biddingCompany.proposals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Attached Proposals:</label>
              <div className="mt-2 flex gap-2">
                {biddingCompany.proposals.map((fileName, index) => {
                  const IconComponent = getFileIcon(fileName);
                  const iconColor = getFileIconColor(fileName);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleFilePreview(fileName)}
                      className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                      title={`Preview ${fileName.split('.').pop()?.toUpperCase()} file`}
                    >
                      <IconComponent className={`h-6 w-6 ${iconColor}`} />
                    </button>
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
            onClick={onClose}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Send PO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}