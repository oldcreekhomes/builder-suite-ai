import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Upload, FileText, Download } from 'lucide-react';
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

  return (
    <div className="space-y-2">
      {/* Solution Text */}
      <div className="space-y-1">
        {isEditingText ? (
          <Textarea
            value={localSolution}
            onChange={(e) => setLocalSolution(e.target.value)}
            onBlur={handleSolutionBlur}
            onKeyDown={handleSolutionKeyDown}
            placeholder="Describe the solution..."
            className="min-h-16 text-sm resize-none"
            autoFocus
          />
        ) : (
          <div 
            className="min-h-8 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 rounded border border-transparent hover:border-border flex items-center break-words"
            onClick={() => setIsEditingText(true)}
            title={localSolution || "Click to add solution"}
          >
            {localSolution || <span className="text-muted-foreground">Click to add solution...</span>}
          </div>
        )}
      </div>

      {/* File Upload Area */}
      <div className="space-y-2">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors text-xs ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-4 w-4 text-gray-500 mb-1" />
          <p className="text-gray-600">
            {isDragActive ? 'Drop files here' : 'Drop or click to upload'}
          </p>
        </div>

        {/* File List */}
        {localFiles.length > 0 && (
          <div className="space-y-1">
            {localFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs">
                <div className="flex items-center space-x-1 min-w-0 flex-1">
                  <FileText className="h-3 w-3 flex-shrink-0 text-gray-500" />
                  <span className="truncate text-gray-700">{file.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleDownloadFile(file.path, file.name)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveFile(file.path)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}