import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FileUploadDropzoneProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export function FileUploadDropzone({ projectId, onUploadSuccess }: FileUploadDropzoneProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    uploading: boolean;
  }>>([]);

  const uploadFile = async (file: File) => {
    if (!user) return;

    const fileId = crypto.randomUUID();
    // Preserve full folder structure including the root folder name
    const fullPath = file.webkitRelativePath || file.name;
    const fileName = `${user.id}/${projectId}/${fileId}_${fullPath}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database with preserved folder structure
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: fullPath, // This preserves the folder structure
          file_size: file.size,
          file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          mime_type: file.type,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${fullPath}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      uploading: true,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map((upload, index) => 
            upload.file === file 
              ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
              : upload
          )
        );
      }, 200);

      const success = await uploadFile(file);
      
      clearInterval(progressInterval);
      
      setUploadingFiles(prev => 
        prev.map(upload => 
          upload.file === file 
            ? { ...upload, progress: 100, uploading: false }
            : upload
        )
      );

      if (success) {
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
          onUploadSuccess();
        }, 1000);
      }
    }
  }, [projectId, user, onUploadSuccess, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    }
  });

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Folder files selected:', files);
    if (files.length > 0) {
      onDrop(files);
    }
    // Reset the input value to allow selecting the same folder again
    event.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div
          {...getRootProps()}
          className={`p-8 text-center cursor-pointer ${
            isDragActive ? 'bg-blue-50 border-blue-400' : ''
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDragActive ? 'Drop files here' : 'Upload files or folders'}
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop files or folders here, or click to select
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports: PDF, Word, Excel, PowerPoint, Text, and Images
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button className="mt-4">
              <FileText className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
            <label htmlFor="folder-upload" className="cursor-pointer">
              <Button type="button" variant="outline" className="mt-4">
                <FolderOpen className="h-4 w-4 mr-2" />
                Choose Folder
              </Button>
              <input
                id="folder-upload"
                type="file"
                {...({ webkitdirectory: "" } as any)}
                multiple
                onChange={handleFolderUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Uploading Files</h4>
          <div className="space-y-3">
            {uploadingFiles.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {upload.file.webkitRelativePath || upload.file.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.file)}
                      disabled={upload.uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress value={upload.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
