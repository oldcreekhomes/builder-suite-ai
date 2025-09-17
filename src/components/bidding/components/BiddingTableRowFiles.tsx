import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';
import { openSpecificationFile } from '@/utils/fileOpenUtils';

interface BiddingTableRowFilesProps {
  item: any;
  isReadOnly?: boolean;
  onFileUpload?: (itemId: string, files: File[]) => void;
  onDeleteFiles?: (itemId: string) => void;
}

export function BiddingTableRowFiles({ item, isReadOnly = false, onFileUpload, onDeleteFiles }: BiddingTableRowFilesProps) {
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

  const handleDeleteFiles = () => {
    if (onDeleteFiles) {
      onDeleteFiles(item.id);
    }
  };

  const handleFilePreview = (fileName: string) => {
    console.log('BIDDING FILES: Opening file', fileName);
    openSpecificationFile(fileName, fileName.split('/').pop());
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
                <button
                  key={index}
                  onClick={() => handleFilePreview(fileName)}
                  className={`${iconColorClass} transition-colors p-1`}
                  title={fileName}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
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
        
        {/* Show delete button when files exist and not read-only */}
        {item.files && item.files.length > 0 && !isReadOnly && (
          <DeleteButton
            onDelete={handleDeleteFiles}
            title="Delete All Files"
            description="Are you sure you want to delete all files? This action cannot be undone."
            size="sm"
            variant="ghost"
            showIcon={true}
          />
        )}
      </div>
    </TableCell>
  );
}