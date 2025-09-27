import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';
import { openFileViaRedirect, getProjectFileStoragePath } from '@/utils/fileOpenUtils';

interface BiddingTableRowFilesProps {
  item: any;
  isReadOnly?: boolean;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
}

export function BiddingTableRowFiles({ item, isReadOnly = false, onFileUpload, onDeleteIndividualFile }: BiddingTableRowFilesProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const handleFileUpload = () => {
    console.log('File upload clicked, onFileUpload function:', !!onFileUpload);
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      console.log('Files selected:', files.length, files.map(f => f.name));
      if (files.length > 0 && onFileUpload) {
        console.log('Calling onFileUpload with item.id:', item.id);
        onFileUpload(item.id, files);
      } else if (!onFileUpload) {
        console.error('onFileUpload is not provided');
      }
    };
    input.click();
  };

  const confirmDelete = () => {
    if (fileToDelete && onDeleteIndividualFile) {
      onDeleteIndividualFile(item.id, fileToDelete);
      setFileToDelete(null);
    }
  };

  const handleFilePreview = (fileName: string) => {
    console.log('📁 BiddingTableRowFiles: Opening file', fileName);
    const displayName = fileName.split('/').pop() || fileName;
    const storagePath = getProjectFileStoragePath(fileName);
    openFileViaRedirect('project-files', storagePath, displayName);
  };

  return (
    <TableCell className="py-1">
      <div className="flex items-center space-x-2">
        {/* Show specification files if they exist */}
        {item.files && item.files.length > 0 && (
          <div className="flex items-center space-x-1">
            {item.files.map((fileName: string, index: number) => {
              const IconComponent = getFileIcon(fileName);
              const iconColorClass = getFileIconColor(fileName);
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleFilePreview(fileName)}
                    className={`${iconColorClass} transition-colors p-1`}
                    title={fileName}
                    type="button"
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(fileName);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                      title="Delete file"
                      type="button"
                    >
                      <span className="text-xs font-bold leading-none">×</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Always show upload button when not read-only */}
        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleFileUpload}
            className="h-8 text-xs"
          >
            Add Files
          </Button>
        )}
      </div>

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.split('/').pop() || fileToDelete}"? This action cannot be undone.`}
      />
    </TableCell>
  );
}