import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { openSpecificationFile } from '@/utils/fileOpenUtils';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';

interface SpecificationFilesCellProps {
  files: string[] | null;
  specificationId: string;
  onFileUpload: (specificationId: string) => void;
  onDeleteAllFiles: (specificationId: string) => void;
  isReadOnly?: boolean;
}

export function SpecificationFilesCell({ 
  files, 
  specificationId, 
  onFileUpload,
  onDeleteAllFiles,
  isReadOnly = false 
}: SpecificationFilesCellProps) {
  const handleFilePreview = (filePath: string) => {
    console.log('SPECIFICATION FILES: Opening file', filePath);
    const fileName = filePath.split('/').pop() || filePath;
    openSpecificationFile(filePath, fileName);
  };

  return (
    <div className="flex items-center justify-between w-full">
      {files && files.length > 0 ? (
        <>
          <div className="flex items-center space-x-2">
            {files.map((filePath, index) => {
              // Extract just the filename from the full path for icon determination and display
              const fileName = filePath.split('/').pop() || filePath;
              const IconComponent = getFileIcon(fileName);
              const iconColorClass = getFileIconColor(fileName);
              return (
                <button
                  key={index}
                  onClick={() => handleFilePreview(filePath)}
                  className={`${iconColorClass} transition-colors p-1`}
                  disabled={isReadOnly}
                  title={fileName}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          {!isReadOnly && (
            <div className="flex items-center pr-2">
              <DeleteButton
                onDelete={() => onDeleteAllFiles(specificationId)}
                title="Delete All Files"
                description="Are you sure you want to delete all specification files? This action cannot be undone."
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
          onClick={() => onFileUpload(specificationId)}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      )}
    </div>
  );
}