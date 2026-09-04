import React, { useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getFileIcon, getFileIconColor, getCleanFileName } from '../bidding/utils/fileIconUtils';
import { useUniversalFilePreviewContext } from '../files/UniversalFilePreviewProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  billId?: string;
  onUploaded?: () => void;
}

export function BillFilesCell({ attachments, billId, onUploaded }: BillFilesCellProps) {
  const fileCount = attachments?.length || 0;
  const { openBillAttachment } = useUniversalFilePreviewContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileClick = (attachment: BillAttachment) => {
    openBillAttachment(attachment.file_path, attachment.file_name, {
      id: attachment.id,
      size: attachment.file_size,
      mimeType: attachment.content_type
    });
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!billId || files.length === 0) return;

    setIsUploading(true);
    let uploadedCount = 0;

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: `${file.name} is larger than 20MB. Please choose a smaller file.`,
            variant: 'destructive',
          });
          continue;
        }

        const sanitizedName = file.name
          .replace(/\s+/g, '_')
          .replace(/[^\w.-]/g, '_')
          .replace(/_+/g, '_');
        const filePath = `${billId}/${Date.now()}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('bill-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Upload Failed',
            description: `Failed to upload ${file.name}.`,
            variant: 'destructive',
          });
          continue;
        }

        const { error: dbError } = await supabase
          .from('bill_attachments')
          .insert({
            bill_id: billId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: userId,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          await supabase.storage.from('bill-attachments').remove([filePath]);
          toast({
            title: 'Upload Failed',
            description: `Could not save ${file.name}.`,
            variant: 'destructive',
          });
          continue;
        }

        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        toast({
          title: 'File Added',
          description: `${uploadedCount} file${uploadedCount > 1 ? 's' : ''} attached to this bill.`,
        });
        onUploaded?.();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const addButton = billId ? (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add file</p>
        </TooltipContent>
      </Tooltip>
    </>
  ) : null;

  if (fileCount === 0) {
    return (
      <div className="flex items-center justify-center">
        {addButton ?? <span className="text-sm text-muted-foreground">—</span>}
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
      {addButton}
    </div>
  );
}
