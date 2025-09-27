import React, { useState, useCallback } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SolutionFile {
  name: string;
  path: string;
}

interface SolutionFilesCellProps {
  issueId: string;
  solutionFiles?: string[];
  onSolutionChange: (solution: string, files: string[]) => void;
  solution?: string;
}

export function SolutionFilesCell({ 
  issueId, 
  solutionFiles = [], 
  onSolutionChange,
  solution = ''
}: SolutionFilesCellProps) {
  const [localFiles, setLocalFiles] = useState<SolutionFile[]>(
    solutionFiles.map(path => ({
      name: path.split('/').pop() || path,
      path
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SolutionFile | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    
    try {
      const uploadedFiles: SolutionFile[] = [];
      
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        // Sanitize filename: replace spaces and special characters with safe alternatives
        const sanitizedName = file.name
          .replace(/\s+/g, '_')  // Replace spaces with underscores
          .replace(/[^\w.-]/g, '_')  // Replace special characters with underscores
          .replace(/_+/g, '_');  // Replace multiple underscores with single underscore
        const fileName = `${Date.now()}-${sanitizedName}`;
        const filePath = `issue-solutions/${issueId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('issue-files')
          .upload(filePath, file);
        
        if (uploadError) {
          throw uploadError;
        }
        
        uploadedFiles.push({
          name: file.name,
          path: filePath
        });
      }
      
      const newFiles = [...localFiles, ...uploadedFiles];
      setLocalFiles(newFiles);
      onSolutionChange(solution, newFiles.map(f => f.path));
      
      toast({ 
        title: 'Files uploaded successfully',
        description: `${uploadedFiles.length} file(s) uploaded to solution.`
      });
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({ 
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [issueId, localFiles, solution, onSolutionChange]);

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        onDrop(files);
      }
    };
    input.click();
  };

  const handleRemoveFile = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('issue-files')
        .remove([filePath]);
      
      if (error) {
        throw error;
      }
      
      const newFiles = localFiles.filter(f => f.path !== filePath);
      setLocalFiles(newFiles);
      onSolutionChange(solution, newFiles.map(f => f.path));
      
      toast({ title: 'File removed successfully' });
    } catch (error: any) {
      console.error('Error removing file:', error);
      toast({ 
        title: 'Failed to remove file',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      handleRemoveFile(fileToDelete.path);
      setFileToDelete(null);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('issue-files')
        .download(filePath);
      
      if (error) {
        throw error;
      }
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({ 
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <TableCell className="px-2 py-1">
      <div className="flex items-center space-x-1">
        {/* Show existing files */}
        {localFiles.length > 0 && (
          <div className="flex items-center space-x-1">
            {localFiles.map((file, index) => {
              const IconComponent = getFileIcon(file.name);
              const iconColorClass = getFileIconColor(file.name);
              return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleDownloadFile(file.path, file.name)}
                    className={`${iconColorClass} transition-colors p-1`}
                    title={file.name}
                    type="button"
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file);
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                    title="Delete file"
                    type="button"
                  >
                    <span className="text-xs font-bold leading-none">×</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Upload button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileUpload}
          disabled={isUploading}
          className="h-6 text-xs px-2"
        >
          {isUploading ? 'Uploading...' : 'Add Files'}
        </Button>
      </div>

      <DeleteConfirmationDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
      />
    </TableCell>
  );
}