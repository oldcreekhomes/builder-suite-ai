import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { DeleteButton } from '@/components/ui/delete-button';
import { supabase } from '@/integrations/supabase/client';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';

interface ProposalCellProps {
  proposals: string[] | null;
  companyId: string;
  onFileUpload: (companyId: string) => void;
  onDeleteAllFiles: (companyId: string) => void;
  isReadOnly?: boolean;
}

export function ProposalCell({ 
  proposals, 
  companyId, 
  onFileUpload,
  onDeleteAllFiles,
  isReadOnly = false 
}: ProposalCellProps) {
  const handleFilePreview = async (fileName: string) => {
    const { openInNewTabSafely, getProposalFileUrl } = await import('@/utils/fileOpenUtils');
    await openInNewTabSafely(() => getProposalFileUrl(fileName));
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
                <button
                  key={index}
                  onClick={() => handleFilePreview(fileName)}
                  className={`${iconColorClass} transition-colors p-1 hover:scale-110`}
                  title={`View ${fileName.split('.').pop()?.toUpperCase()} file - ${fileName}`}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
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
    </div>
  );
}