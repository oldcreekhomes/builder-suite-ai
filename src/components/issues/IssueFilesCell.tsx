import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { openIssueFile } from '@/utils/fileOpenUtils';

interface IssueFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
}

interface IssueFilesCellProps {
  issueId: string;
  files?: IssueFile[];
  onFilesChange?: (files: IssueFile[]) => void;
  isUploading?: boolean;
  onFileUpload?: (files: File[]) => void;
  onFileDelete?: (fileId: string, filePath: string) => void;
}

export function IssueFilesCell({ 
  issueId, 
  files = [], 
  onFilesChange, 
  isUploading = false,
  onFileUpload,
  onFileDelete
}: IssueFilesCellProps) {
  const [fileToDelete, setFileToDelete] = useState<IssueFile | null>(null);

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
      if (selectedFiles.length > 0 && onFileUpload) {
        onFileUpload(selectedFiles);
      }
    };
    input.click();
  };

  const confirmDelete = () => {
    if (fileToDelete && onFileDelete) {
      onFileDelete(fileToDelete.id, fileToDelete.file_path);
      setFileToDelete(null);
    }
  };

  const handleFilePreview = (file: IssueFile) => {
    openIssueFile(file.file_path, file.file_name);
  };

  return (
    <TableCell className="px-2 py-1">
      <div className="flex items-center space-x-1">
        {/* Show existing files */}
        {files.length > 0 && (
          <div className="flex items-center space-x-1">
            {files.map((file) => {
              const IconComponent = getFileIcon(file.file_name);
              const iconColorClass = getFileIconColor(file.file_name);
              return (
                <div key={file.id} className="relative group">
                  <button
                    onClick={() => handleFilePreview(file)}
                    className={`${iconColorClass} transition-colors p-1`}
                    title={file.file_name}
                    type="button"
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file);
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                    title="Delete file"
                    type="button"
                  >
                    <span className="text-xs font-bold leading-none">×</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Upload button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileUpload}
          disabled={isUploading}
          className="h-6 text-xs px-2"
        >
          {isUploading ? 'Uploading...' : 'Add Files'}
        </Button>
      </div>

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.file_name}"? This action cannot be undone.`}
      />
    </TableCell>
  );
}