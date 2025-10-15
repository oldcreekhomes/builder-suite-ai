import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface SpecificationFilesCellProps {
  files: string[] | null;
  specificationId: string;
  onFileUpload: (specificationId: string) => void;
  onDeleteIndividualFile: (specificationId: string, fileName: string) => void;
  isReadOnly?: boolean;
}

export function SpecificationFilesCell({ 
  files, 
  specificationId, 
  onFileUpload,
  onDeleteIndividualFile,
  isReadOnly = false 
}: SpecificationFilesCellProps) {
  const { openSpecificationFile } = useUniversalFilePreviewContext();
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  
  const handleFilePreview = (filePath: string) => {
    console.log('SPECIFICATION FILES: Opening file', filePath);
    const fileName = filePath.split('/').pop() || filePath;
    openSpecificationFile(filePath, fileName);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      onDeleteIndividualFile(specificationId, fileToDelete);
      setFileToDelete(null);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {files && files.length > 0 && (
        <div className="flex items-center space-x-1">
          {files.map((filePath, index) => {
            const fileName = filePath.split('/').pop() || filePath;
            const IconComponent = getFileIcon(fileName);
            const iconColorClass = getFileIconColor(fileName);
            return (
              <div key={index} className="relative group">
                <button
                  onClick={() => handleFilePreview(filePath)}
                  className={`${iconColorClass} transition-colors p-1`}
                  disabled={isReadOnly}
                  title={fileName}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
                {!isReadOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(filePath);
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                    title="Delete file"
                  >
                    <span className="text-xs font-bold leading-none">×</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {!isReadOnly && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onFileUpload(specificationId)}
        >
          Add Files
        </Button>
      )}

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete File"
        description="Are you sure you want to delete this file? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
