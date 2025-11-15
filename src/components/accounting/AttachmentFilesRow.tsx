import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
}

interface AttachmentFilesRowProps {
  files: Attachment[];
  onFileUpload?: (files: File[]) => void;
  onDeleteFile?: (fileId: string) => void;
  isReadOnly?: boolean;
  isUploading?: boolean;
  entityType: 'journal_entry' | 'check' | 'deposit' | 'credit_card';
}

export function AttachmentFilesRow({ 
  files, 
  onFileUpload, 
  onDeleteFile, 
  isReadOnly = false,
  isUploading = false,
  entityType
}: AttachmentFilesRowProps) {
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const { 
    openJournalEntryAttachment, 
    openCheckAttachment, 
    openDepositAttachment, 
    openCreditCardAttachment 
  } = useUniversalFilePreviewContext();

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0 && onFileUpload) {
        onFileUpload(files);
      }
    };
    input.click();
  };

  const confirmDelete = () => {
    if (fileToDelete && onDeleteFile) {
      onDeleteFile(fileToDelete);
      setFileToDelete(null);
    }
  };

  const handleFilePreview = (file: Attachment) => {
    switch (entityType) {
      case 'journal_entry':
        openJournalEntryAttachment(file.file_path, file.file_name);
        break;
      case 'check':
        openCheckAttachment(file.file_path, file.file_name);
        break;
      case 'deposit':
        openDepositAttachment(file.file_path, file.file_name);
        break;
      case 'credit_card':
        openCreditCardAttachment(file.file_path, file.file_name);
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Show file icons if any exist */}
      {files.length > 0 && (
        <div className="flex items-center gap-1">
          {files.map((file) => {
            const IconComponent = getFileIcon(file.file_name);
            const iconColorClass = getFileIconColor(file.file_name);
            return (
              <div key={file.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleFilePreview(file)}
                  className={`${iconColorClass} transition-colors p-1 rounded hover:bg-muted`}
                  title={file.file_name}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file.id);
                    }}
                    className="absolute -top-1 -right-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                    title="Delete file"
                  >
                    <span className="text-[10px] font-bold leading-none">×</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Show Add Files button ONLY when no files exist */}
      {files.length === 0 && !isReadOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFileUpload}
          disabled={isUploading}
          className="h-8"
        >
          {isUploading ? 'Uploading...' : 'Add Files'}
        </Button>
      )}

      {/* Show message for read-only with no files */}
      {files.length === 0 && isReadOnly && (
        <span className="text-sm text-muted-foreground">No files attached</span>
      )}

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete Attachment"
        description="Are you sure you want to delete this attachment? This action cannot be undone."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
