import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, FileText, Download, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SolutionFile {
  name: string;
  path: string;
}

interface SolutionFileUploadProps {
  issueId: string;
  solution?: string;
  solutionFiles?: string[];
  onSolutionChange: (solution: string, files: string[]) => void;
}

export function SolutionFileUpload({ 
  issueId, 
  solution = '', 
  solutionFiles = [], 
  onSolutionChange 
}: SolutionFileUploadProps) {
  const [localSolution, setLocalSolution] = useState(solution);
  const [localFiles, setLocalFiles] = useState<SolutionFile[]>(
    solutionFiles.map(path => ({
      name: path.split('/').pop() || path,
      path
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    
    try {
      const uploadedFiles: SolutionFile[] = [];
      
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name}`;
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
      onSolutionChange(localSolution, newFiles.map(f => f.path));
      
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
  }, [issueId, localFiles, localSolution, onSolutionChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading
  });

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
      onSolutionChange(localSolution, newFiles.map(f => f.path));
      
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

  const handleSolutionBlur = () => {
    if (localSolution !== solution) {
      onSolutionChange(localSolution, localFiles.map(f => f.path));
    }
    setIsEditingText(false);
  };

  const handleSolutionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setLocalSolution(solution);
      setIsEditingText(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onDrop(files);
    }
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Add Files Button */}
      <Button
        size="sm"
        variant="ghost"
        disabled={isUploading}
        className="h-8 px-2 text-xs"
        onClick={() => document.getElementById(`solution-file-input-${issueId}`)?.click()}
        >
        {isUploading ? 'Uploading...' : 'Add Files'}
      </Button>
      
      <input
        id={`solution-file-input-${issueId}`}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Solution Text Indicator */}
      {localSolution && !isEditingText && (
        <div className="flex items-center gap-1 bg-muted/20 rounded px-2 py-1">
          <Edit3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs max-w-[100px] truncate" title={localSolution}>
            Solution text
          </span>
        </div>
      )}
      
      {/* Solution Files */}
      {localFiles.map((file, index) => (
        <div 
          key={index}
          className="flex items-center gap-1 bg-muted/20 rounded px-2 py-1"
        >
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs max-w-[100px] truncate" title={file.name}>
            {file.name}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownloadFile(file.path, file.name)}
            className="h-4 w-4 p-0 hover:bg-primary/10"
          >
            <Download className="h-3 w-3 text-primary" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveFile(file.path)}
            className="h-4 w-4 p-0 hover:bg-destructive/10"
          >
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Inline Text Editor */}
      {isEditingText && (
        <div className="w-full mt-2">
          <Textarea
            value={localSolution}
            onChange={(e) => setLocalSolution(e.target.value)}
            onBlur={handleSolutionBlur}
            onKeyDown={handleSolutionKeyDown}
            placeholder="Describe the solution..."
            className="min-h-16 text-sm resize-none"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}