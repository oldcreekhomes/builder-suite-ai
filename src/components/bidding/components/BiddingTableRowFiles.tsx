import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import { Upload } from 'lucide-react';
import { getFileIcon, getFileIconColor } from '../utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';

interface BiddingTableRowFilesProps {
  item: any;
  isReadOnly?: boolean;
}

export function BiddingTableRowFiles({ item, isReadOnly = false }: BiddingTableRowFilesProps) {
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Handle bid package file upload - we'll need to implement this
        console.log('Bid package files:', files);
      }
    };
    input.click();
  };

  const handleFilePreview = async (fileName: string) => {
    try {
      const { data } = supabase.storage
        .from('project-files')
        .getPublicUrl(`specifications/${fileName}`);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  return (
    <TableCell className="py-1">
      <div className="flex items-center space-x-2">
        {/* Show specification files if they exist */}
        {item.files && item.files.length > 0 ? (
          <>
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
            {!isReadOnly && (
              <DeleteButton
                onDelete={handleFileUpload} // This would be delete all files function
                title="Delete All Files"
                description="Are you sure you want to delete all files? This action cannot be undone."
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            )}
          </>
        ) : (
          !isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileUpload}
              className="h-8 text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Files
            </Button>
          )
        )}
      </div>
    </TableCell>
  );
}