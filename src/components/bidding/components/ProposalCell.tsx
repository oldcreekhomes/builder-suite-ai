import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';

interface ProposalCellProps {
  proposals: string | null;
  companyId: string;
  onFileUpload: (companyId: string) => void;
  onFilePreview: (fileName: string) => void;
  isReadOnly?: boolean;
}

export function ProposalCell({ 
  proposals, 
  companyId, 
  onFileUpload, 
  onFilePreview, 
  isReadOnly = false 
}: ProposalCellProps) {
  return (
    <div className="flex items-center space-x-2">
      {proposals ? (
        <div className="flex items-center space-x-2">
          {(() => {
            const IconComponent = getFileIcon(proposals);
            const iconColorClass = getFileIconColor(proposals);
            return (
              <button
                onClick={() => onFilePreview(proposals)}
                className={`${iconColorClass} transition-colors p-1`}
                disabled={isReadOnly}
              >
                <IconComponent className="h-4 w-4" />
              </button>
            );
          })()}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onFileUpload(companyId)}
            >
              Replace
            </Button>
          )}
        </div>
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