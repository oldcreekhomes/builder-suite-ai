import React, { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor, getCleanFileName } from '../utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { SelectProjectFilesModal } from '../SelectProjectFilesModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Upload, FolderOpen } from 'lucide-react';

// Helper to get storage path for specification files
const getProjectFileStoragePath = (fileRef: string): string => {
  if (fileRef.includes('/')) return fileRef;
  return `specifications/${fileRef}`;
};

interface BiddingTableRowFilesProps {
  item: any;
  isReadOnly?: boolean;
  projectId?: string;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteIndividualFile?: (itemId: string, fileName: string) => void;
  onLinkProjectFiles?: (itemId: string, storagePaths: string[]) => void;
}

export function BiddingTableRowFiles({ 
  item, 
  isReadOnly = false, 
  projectId,
  onFileUpload, 
  onDeleteIndividualFile,
  onLinkProjectFiles 
}: BiddingTableRowFilesProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showProjectFilesModal, setShowProjectFilesModal] = useState(false);
  const { openSpecificationFile } = useUniversalFilePreviewContext();

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

  const handleSelectProjectFiles = (storagePaths: string[]) => {
    if (onLinkProjectFiles && storagePaths.length > 0) {
      onLinkProjectFiles(item.id, storagePaths);
    }
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
    openSpecificationFile(storagePath, displayName);
  };

  // Get existing file paths to exclude from project files modal
  const existingFilePaths = (item.files || []).map((f: string) => getProjectFileStoragePath(f));

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
                    title={getCleanFileName(fileName)}
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
        
        {/* Dropdown for add file options when not read-only */}
        {!isReadOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                Add Files
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleFileUpload}>
                <Upload className="mr-2 h-4 w-4" />
                From Computer
              </DropdownMenuItem>
              {projectId && onLinkProjectFiles && (
                <DropdownMenuItem onClick={() => setShowProjectFilesModal(true)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  From Project Files
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete ? getCleanFileName(fileToDelete) : ''}"? This action cannot be undone.`}
      />

      {/* Project Files Selection Modal */}
      {projectId && (
        <SelectProjectFilesModal
          open={showProjectFilesModal}
          onOpenChange={setShowProjectFilesModal}
          projectId={projectId}
          onSelectFiles={handleSelectProjectFiles}
          existingFiles={existingFilePaths}
        />
      )}
    </TableCell>
  );
}