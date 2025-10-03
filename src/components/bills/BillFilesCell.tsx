import React from 'react';
import { getFileIcon, getFileIconColor } from '../bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BillAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

interface BillFilesCellProps {
  attachments: BillAttachment[];
}

export function BillFilesCell({ attachments }: BillFilesCellProps) {
  const fileCount = attachments?.length || 0;

  const handleFileDownload = async (attachment: BillAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('bill-attachments')
        .download(attachment.file_path);

      if (error) {
        console.error('Download error:', error);
        toast({
          title: "Download Failed",
          description: "Failed to download the file. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unexpected download error:', error);
      toast({
        title: "Download Failed",
        description: "An unexpected error occurred while downloading the file.",
        variant: "destructive",
      });
    }
  };

  if (fileCount === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {attachments.slice(0, 3).map((attachment) => {
        const IconComponent = getFileIcon(attachment.file_name);
        const iconColorClass = getFileIconColor(attachment.file_name);
        return (
          <button
            key={attachment.id}
            onClick={() => handleFileDownload(attachment)}
            className={`inline-block ${iconColorClass} transition-colors p-1`}
            title={attachment.file_name}
          >
            <IconComponent className="h-4 w-4" />
          </button>
        );
      })}
      {attachments.length > 3 && (
        <span className="text-xs text-muted-foreground ml-1">
          +{attachments.length - 3}
        </span>
      )}
    </div>
  );
}
