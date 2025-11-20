import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface JournalEntryAttachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type?: string | null;
  file?: File;
}

interface JournalEntryAttachmentUploadProps {
  attachments: JournalEntryAttachment[];
  onFileUpload: (files: File[]) => Promise<void>;
  onDeleteFile: (attachmentId: string) => Promise<void>;
  isUploading?: boolean;
  disabled?: boolean;
}

export function JournalEntryAttachmentUpload({ 
  attachments, 
  onFileUpload,
  onDeleteFile,
  isUploading = false,
  disabled = false 
}: JournalEntryAttachmentUploadProps) {
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes before uploading
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 20MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      await onFileUpload(validFiles);
    }

    // Reset the input
    event.target.value = '';
  }, [onFileUpload, disabled]);

  const handleRemoveAttachment = async (attachment: JournalEntryAttachment) => {
    if (disabled || !attachment.id) return;
    await onDeleteFile(attachment.id);
  };

  const handleDownloadAttachment = async (attachment: JournalEntryAttachment) => {
    if (!attachment.id) return;

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
    <div className="space-y-2">
      <Label>Attachments</Label>
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
                disabled={!attachment.id}
              >
                <IconComponent className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleRemoveAttachment(attachment)}
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
        
        {/* Add Files button - always visible */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('journal-entry-file-input')?.click()}
          disabled={disabled || isUploading}
          className="h-8 text-xs px-3"
        >
          {isUploading ? 'Uploading...' : 'Add Files'}
        </Button>
        
        <input
          id="journal-entry-file-input"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        />
      </div>
    </div>
  );
}
