import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, File, Trash2, Eye, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface BillAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

interface BillPDFUploadProps {
  billId?: string;
  onFilesChange: (files: BillAttachment[]) => void;
  uploadedFiles: BillAttachment[];
  disabled?: boolean;
}

export function BillPDFUpload({ billId, onFilesChange, uploadedFiles, disabled }: BillPDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || disabled) return;

    setIsUploading(true);
    
    try {
      const newFiles: BillAttachment[] = [];
      
      for (const file of acceptedFiles) {
        // Generate unique file path
        const timestamp = Date.now();
        const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = billId 
          ? `${billId}/${timestamp}_${fileName}`
          : `temp/${timestamp}_${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bill-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
          continue;
        }

        // Create attachment record if we have a bill ID
        if (billId) {
          const { data: attachmentData, error: attachmentError } = await supabase
            .from('bill_attachments')
            .insert({
              bill_id: billId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: user.id
            })
            .select()
            .single();

          if (attachmentError) {
            console.error('Attachment record error:', attachmentError);
            // Clean up uploaded file
            await supabase.storage.from('bill-attachments').remove([filePath]);
            toast({
              title: "Database Error",
              description: `Failed to create attachment record for ${file.name}`,
              variant: "destructive",
            });
            continue;
          }

          newFiles.push(attachmentData);
        } else {
          // Temporary file for unsaved bills
          newFiles.push({
            id: `temp-${timestamp}`,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            content_type: file.type,
            uploaded_at: new Date().toISOString()
          });
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...uploadedFiles, ...newFiles]);
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newFiles.length} file(s)`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, billId, uploadedFiles, onFilesChange, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
    disabled: isUploading || disabled
  });

  const handleDeleteFile = async (file: BillAttachment) => {
    if (disabled) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('bill-attachments')
        .remove([file.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        toast({
          title: "Deletion Failed",
          description: `Failed to delete ${file.file_name} from storage`,
          variant: "destructive",
        });
        return;
      }

      // Delete from database if it's not a temporary file
      if (!file.id.startsWith('temp-')) {
        const { error: dbError } = await supabase
          .from('bill_attachments')
          .delete()
          .eq('id', file.id);

        if (dbError) {
          console.error('Database deletion error:', dbError);
          toast({
            title: "Database Error",
            description: `Failed to delete ${file.file_name} from database`,
            variant: "destructive",
          });
          return;
        }
      }

      // Update local state
      onFilesChange(uploadedFiles.filter(f => f.id !== file.id));
      
      toast({
        title: "File Deleted",
        description: `${file.file_name} has been deleted`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Deletion Error",
        description: "An unexpected error occurred during deletion",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (file: BillAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('bill-attachments')
        .createSignedUrl(file.file_path, 3600); // 1 hour

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast({
          title: "View Error",
          description: "Failed to generate download link",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "View Error", 
        description: "An error occurred while viewing the file",
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
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bill Attachments
        </CardTitle>
        <CardDescription>
          Upload PDF files related to this bill (Max 20MB per file)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary font-medium">Drop PDF files here...</p>
          ) : (
            <div>
              <p className="font-medium mb-1">
                {isUploading ? 'Uploading...' : 'Click or drag PDF files here'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF files up to 20MB each
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Uploaded Files ({uploadedFiles.length})</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <File className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                        {file.id.startsWith('temp-') && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Temporary
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFile(file)}
                      disabled={disabled}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}