import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';

interface ProposalCellProps {
  proposals: string[] | null;
  companyId: string;
  onFileUpload: (companyId: string) => void;
  onDeleteIndividualFile: (companyId: string, fileName: string) => void;
  onDeleteAllFiles: (companyId: string) => void;
  isReadOnly?: boolean;
}

export function ProposalCell({ 
  proposals, 
  companyId, 
  onFileUpload,
  onDeleteIndividualFile,
  onDeleteAllFiles,
  isReadOnly = false 
}: ProposalCellProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const { openProposalFile } = useUniversalFilePreviewContext();
  
  const handleFilePreview = (fileName: string) => {
    console.log('PROPOSAL CELL: Opening file', fileName);
    openProposalFile(fileName);
  };

  const confirmDelete = (fileName: string) => {
    onDeleteIndividualFile(companyId, fileName);
    setFileToDelete(null);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-2">
        {proposals && proposals.length > 0 && proposals.map((fileName, index) => {
          const IconComponent = getFileIcon(fileName);
          const iconColorClass = getFileIconColor(fileName);
          return (
            <div key={index} className="relative">
              <button
                onClick={() => handleFilePreview(fileName)}
                className={`${iconColorClass} transition-colors p-1 hover:scale-110`}
                title={`View ${fileName.split('.').pop()?.toUpperCase()} file - ${fileName}`}
              >
                <IconComponent className="h-4 w-4" />
              </button>
              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileToDelete(fileName);
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                  title="Delete file"
                  type="button"
                >
                  <span className="text-xs font-bold leading-none">×</span>
                </button>
              )}
            </div>
          );
        })}
        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onFileUpload(companyId)}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add Files
          </Button>
        )}
      </div>
      {proposals && proposals.length > 0 && !isReadOnly && (
        <div className="flex items-center pr-2">
          <DeleteButton
            onDelete={() => onDeleteAllFiles(companyId)}
            title="Delete All Proposals"
            description="Are you sure you want to delete all proposal files? This action cannot be undone."
            size="sm"
            variant="ghost"
            showIcon={true}
          />
        </div>
      )}
      
      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete Proposal File"
        description={`Are you sure you want to delete "${fileToDelete?.split('/').pop() || fileToDelete}"? This action cannot be undone.`}
        onConfirm={() => fileToDelete && confirmDelete(fileToDelete)}
      />
    </div>
  );
}