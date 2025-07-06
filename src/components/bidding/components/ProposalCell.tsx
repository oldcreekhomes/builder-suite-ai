import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';

interface ProposalCellProps {
  proposals: string[] | null;
  companyId: string;
  onFileUpload: (companyId: string) => void;
  onFileDelete: (companyId: string, fileName: string) => void;
  isReadOnly?: boolean;
}

export function ProposalCell({ 
  proposals, 
  companyId, 
  onFileUpload,
  onFileDelete,
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
      {proposals && proposals.length > 0 ? (
        <div className="flex items-center space-x-2">
          {proposals.map((fileName, index) => {
            const IconComponent = getFileIcon(fileName);
            const iconColorClass = getFileIconColor(fileName);
            return (
              <div key={index} className="flex items-center space-x-1">
                <button
                  onClick={() => handleFilePreview(fileName)}
                  className={`${iconColorClass} transition-colors p-1`}
                  disabled={isReadOnly}
                  title={fileName}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
                {!isReadOnly && (
                  <button
                    onClick={() => onFileDelete(companyId, fileName)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
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