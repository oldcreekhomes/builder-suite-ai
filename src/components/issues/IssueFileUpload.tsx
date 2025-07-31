import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IssueFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
}

interface IssueFileUploadProps {
  issueId: string;
  files?: IssueFile[];
  onFilesChange?: (files: IssueFile[]) => void;
  className?: string;
}

export function IssueFileUpload({ issueId, files = [], onFilesChange, className }: IssueFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${issueId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('issue-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save file metadata to database
        const { data: fileData, error: dbError } = await supabase
          .from('issue_files')
          .insert({
            issue_id: issueId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: fileExt,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        
        return fileData;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const newFiles = [...files, ...uploadedFiles];
      onFilesChange?.(newFiles);

      toast({
        title: "Success",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleFileDelete = async (fileId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('issue-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('issue_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      const newFiles = files.filter(f => f.id !== fileId);
      onFilesChange?.(newFiles);

      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleFileOpen = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('issue-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;

      // Open file in new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Open error:', error);
      toast({
        title: "Error",
        description: "Failed to open file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Add Files Button */}
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          className="h-8"
          onClick={() => document.getElementById(`file-input-${issueId}`)?.click()}
        >
          <Upload className="h-3 w-3 mr-1" />
          {uploading ? 'Uploading...' : 'Add Files'}
        </Button>
        
        <Input
          id={`file-input-${issueId}`}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Existing Files */}
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
            <button
              onClick={() => handleFileOpen(file.file_path)}
              className="hover:bg-muted/50 p-1 rounded transition-colors"
              title={file.file_name}
            >
              <File className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => handleFileDelete(file.id, file.file_path)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}