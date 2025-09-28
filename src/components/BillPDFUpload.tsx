import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface BillAttachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  file?: File;
}

interface BillPDFUploadProps {
  attachments: BillAttachment[];
  onAttachmentsChange: (attachments: BillAttachment[]) => void;
  billId?: string;
  disabled?: boolean;
}

export function BillPDFUpload({ 
  attachments, 
  onAttachmentsChange, 
  billId,
  disabled = false 
}: BillPDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;
    
    setIsUploading(true);
    const newAttachments: BillAttachment[] = [];

    for (const file of acceptedFiles) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a PDF file. Only PDF files are allowed.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 20MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        continue;
      }

      // If we have a billId, upload to storage immediately
      if (billId) {
        try {
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name}`;
          const filePath = `${billId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('bill-attachments')
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
            .from('bill_attachments')
            .insert({
              bill_id: billId,
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
            await supabase.storage.from('bill-attachments').remove([filePath]);
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
            content_type: attachment.content_type
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
        // If no billId yet, just store the file temporarily
        const tempAttachment: BillAttachment = {
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
        description: `${newAttachments.length} PDF file(s) added successfully.`,
      });
    }

    setIsUploading(false);
  }, [attachments, onAttachmentsChange, billId, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: disabled || isUploading
  });

  const handleRemoveAttachment = async (index: number) => {
    if (disabled) return;

    const attachment = attachments[index];
    
    // If attachment has an ID, it's saved in the database
    if (attachment.id && billId) {
      try {
        // Delete from database
        const { error: dbError } = await supabase
          .from('bill_attachments')
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
          .from('bill-attachments')
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
    
    toast({
      title: "Attachment Removed",
      description: `${attachment.file_name} has been removed.`,
    });
  };

  const handleDownloadAttachment = async (attachment: BillAttachment) => {
    if (!attachment.id || !billId) return;

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bill Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive && "border-primary bg-primary/5",
            !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isUploading ? (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop PDF files here...</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Drag & drop PDF files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                PDF files only, max 20MB each
              </p>
            </div>
          )}
        </div>

        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Attached Files</h4>
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.file_path}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/25"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {attachment.id && billId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadAttachment(attachment)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(index)}
                    disabled={disabled}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}