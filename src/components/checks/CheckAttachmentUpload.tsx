import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CheckAttachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  file?: File;
}

interface CheckAttachmentUploadProps {
  attachments: CheckAttachment[];
  onAttachmentsChange: (attachments: CheckAttachment[]) => void;
  checkId?: string;
  disabled?: boolean;
}

export function CheckAttachmentUpload({ 
  attachments, 
  onAttachmentsChange, 
  checkId,
  disabled = false 
}: CheckAttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newAttachments: CheckAttachment[] = [];

    for (const file of files) {
      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 20MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        continue;
      }

      // If we have a checkId, upload to storage immediately
      if (checkId) {
        try {
          const timestamp = Date.now();
          const sanitizedName = file.name
            .replace(/\s+/g, '_')
            .replace(/[^\w.-]/g, '_')
            .replace(/_+/g, '_');
          const fileName = `${timestamp}_${sanitizedName}`;
          const filePath = `check-attachments/${checkId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast({
              title: "Upload Failed",
              description: `Failed to upload ${file.name}. Please try again.`,
              variant: "destructive",
            });
            continue;
          }

          // Save attachment metadata to database
          const { data: attachment, error: dbError } = await supabase
            .from('check_attachments')
            .insert({
              check_id: checkId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            // Clean up uploaded file
            await supabase.storage.from('project-files').remove([filePath]);
            toast({
              title: "Database Error",
              description: `Failed to save ${file.name} metadata. Please try again.`,
              variant: "destructive",
            });
            continue;
          }

          newAttachments.push({
            id: attachment.id,
            file_name: attachment.file_name,
            file_path: attachment.file_path,
            file_size: attachment.file_size,
            content_type: attachment.content_type || file.type
          });
        } catch (error) {
          console.error('Unexpected error:', error);
          toast({
            title: "Upload Failed",
            description: `An unexpected error occurred while uploading ${file.name}.`,
            variant: "destructive",
          });
        }
      } else {
        // If no checkId yet, just store the file temporarily
        const tempAttachment: CheckAttachment = {
          file_name: file.name,
          file_path: `temp_${Date.now()}_${file.name}`,
          file_size: file.size,
          content_type: file.type,
          file
        };
        newAttachments.push(tempAttachment);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      toast({
        title: "Files Added",
        description: `${newAttachments.length} file(s) added successfully.`,
      });
    }

    setIsUploading(false);
    // Reset the input
    event.target.value = '';
  }, [attachments, onAttachmentsChange, checkId, disabled]);

  const handleRemoveAttachment = async (index: number) => {
    if (disabled) return;

    const attachment = attachments[index];
    
    // If attachment has an ID, it's saved in the database
    if (attachment.id && checkId) {
      try {
        // Delete from database
        const { error: dbError } = await supabase
          .from('check_attachments')
          .delete()
          .eq('id', attachment.id);

        if (dbError) {
          console.error('Database delete error:', dbError);
          toast({
            title: "Delete Failed",
            description: "Failed to remove attachment from database.",
            variant: "destructive",
          });
          return;
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([attachment.file_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Don't show error to user as database record is already deleted
        }
      } catch (error) {
        console.error('Unexpected error during deletion:', error);
        toast({
          title: "Delete Failed",
          description: "An unexpected error occurred while removing the attachment.",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updatedAttachments);
  };

  const handleDownloadAttachment = async (attachment: CheckAttachment) => {
    if (!attachment.id || !checkId) return;

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
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

  return (
    <div className="flex items-center space-x-2">
      {/* Show existing files as small icons */}
      {attachments.map((attachment, index) => {
        const IconComponent = getFileIcon(attachment.file_name);
        const iconColorClass = getFileIconColor(attachment.file_name);
        return (
          <div key={index} className="relative group">
            <button
              onClick={() => handleDownloadAttachment(attachment)}
              className={`${iconColorClass} transition-colors p-1 rounded hover:bg-muted/50`}
              title={attachment.file_name}
              type="button"
              disabled={!attachment.id || !checkId}
            >
              <IconComponent className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleRemoveAttachment(index)}
              className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center transition-colors"
              title="Remove attachment"
              type="button"
              disabled={disabled}
            >
              <span className="text-xs font-bold leading-none">×</span>
            </button>
          </div>
        );
      })}
      
      {/* Add Files button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById('check-file-input')?.click()}
        disabled={disabled || isUploading}
        className="h-10 flex-1"
      >
        {isUploading ? 'Uploading...' : 'Add Files'}
      </Button>
      
      <input
        id="check-file-input"
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
      />
    </div>
  );
}
