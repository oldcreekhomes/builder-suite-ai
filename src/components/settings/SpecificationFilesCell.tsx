import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';
import { SpecificationFilePreviewModal } from './SpecificationFilePreviewModal';

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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  
  const handleFilePreview = (fileName: string) => {
    setSelectedFile(fileName);
    setPreviewModalOpen(true);
  };

  return (
    <div className="flex items-center w-full">
      {files && files.length > 0 ? (
        <>
          <div className="flex items-center space-x-2">
            {files.map((fileName, index) => {
              const IconComponent = getFileIcon(fileName);
              const iconColorClass = getFileIconColor(fileName);
              return (
                <button
                  key={index}
                  onClick={() => handleFilePreview(fileName)}
                  className={`${iconColorClass} hover:scale-110 transition-all p-1`}
                  disabled={isReadOnly}
                  title={fileName.includes('-') && /^\d{13}-/.test(fileName) ? fileName.split('-').slice(1).join('-') : fileName}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
              );
            })}
            {!isReadOnly && (
              <DeleteButton
                onDelete={() => onDeleteAllFiles(specificationId)}
                title="Delete All Files"
                description="Are you sure you want to delete all specification files? This action cannot be undone."
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center space-x-2">
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
        </div>
      )}
      
      <SpecificationFilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedFile(null);
        }}
        fileName={selectedFile}
      />
    </div>
  );
}