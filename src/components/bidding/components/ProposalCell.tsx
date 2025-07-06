import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';

interface ProposalCellProps {
  proposals: string | null;
  companyId: string;
  onFileUpload: (companyId: string) => void;
  isReadOnly?: boolean;
}

export function ProposalCell({ 
  proposals, 
  companyId, 
  onFileUpload, 
  isReadOnly = false 
}: ProposalCellProps) {
  const handleFilePreview = async (fileName: string) => {
    try {
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(`proposals/${fileName}`);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {proposals ? (
        <div className="flex items-center space-x-2">
          {(() => {
            const IconComponent = getFileIcon(proposals);
            const iconColorClass = getFileIconColor(proposals);
            return (
              <button
                onClick={() => handleFilePreview(proposals)}
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