import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';
import { openProposalFile } from '@/utils/fileOpenUtils';

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
      {proposals && proposals.length > 0 ? (
        <>
          <div className="flex items-center space-x-2">
            {proposals.map((fileName, index) => {
              const IconComponent = getFileIcon(fileName);
              const iconColorClass = getFileIconColor(fileName);
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleFilePreview(fileName)}
                    className={`${iconColorClass} transition-colors p-1 hover:scale-110`}
                    title={`View ${fileName.split('.').pop()?.toUpperCase()} file - ${fileName}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => setFileToDelete(fileName)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete this file"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!isReadOnly && (
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
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isReadOnly}
          onClick={() => onFileUpload(companyId)}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      )}
      
      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete Proposal File"
        description={`Are you sure you want to delete "${fileToDelete}"? This action cannot be undone.`}
        onConfirm={() => fileToDelete && confirmDelete(fileToDelete)}
      />
    </div>
  );
}