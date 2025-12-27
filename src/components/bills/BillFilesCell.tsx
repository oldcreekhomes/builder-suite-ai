import React from 'react';
import { getFileIcon, getFileIconColor, getCleanFileName } from '../bidding/utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '../files/UniversalFilePreviewProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { openBillAttachment } = useUniversalFilePreviewContext();

  const handleFileClick = (attachment: BillAttachment) => {
    openBillAttachment(attachment.file_path, attachment.file_name, {
      id: attachment.id,
      size: attachment.file_size,
      mimeType: attachment.content_type
    });
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
            <Tooltip key={attachment.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleFileClick(attachment)}
                  className={`inline-block ${iconColorClass} transition-colors p-1 hover:opacity-80`}
                >
                  <IconComponent className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getCleanFileName(attachment.file_name)}</p>
              </TooltipContent>
            </Tooltip>
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
