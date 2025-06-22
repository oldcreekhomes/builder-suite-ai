
import { useState, useCallback, useRef } from "react";
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
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    uploading: boolean;
    relativePath: string;
  }>>([]);

  const uploadFile = async (file: File, relativePath: string) => {
    if (!user) return;

    const fileId = crypto.randomUUID();
    
    console.log('Uploading file with preserved path:', {
      name: file.name,
      relativePath: relativePath,
      size: file.size
    });
    
    // Create storage path that preserves the folder structure
    const fileName = `${user.id}/${projectId}/${fileId}_${relativePath}`;
    
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
          original_filename: relativePath, // This preserves the complete folder structure
          file_size: file.size,
          file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          mime_type: file.type,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      console.log('Successfully uploaded file with path:', relativePath);
      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${relativePath}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Process files from native drag and drop (preserves folder structure)
  const processFilesFromDataTransfer = async (dataTransfer: DataTransfer) => {
    const files: Array<{ file: File; relativePath: string }> = [];
    
    const items = Array.from(dataTransfer.items);
    
    // Process all items concurrently to handle multiple folders
    const promises = items.map(async (item) => {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          await traverseFileTree(entry, '', files);
        } else {
          // Fallback for browsers that don't support webkitGetAsEntry
          const file = item.getAsFile();
          if (file) {
            files.push({ file, relativePath: file.name });
          }
        }
      }
    });
    
    await Promise.all(promises);
    
    console.log('Files with preserved paths from multiple folders:', files.map(f => ({ name: f.file.name, path: f.relativePath })));
    
    return files;
  };

  // Recursively traverse directory structure
  const traverseFileTree = (item: any, path: string, files: Array<{ file: File; relativePath: string }>) => {
    return new Promise<void>((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          const fullPath = path + file.name;
          files.push({ file, relativePath: fullPath });
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        
        // Read all entries in the directory
        const readEntries = () => {
          dirReader.readEntries((entries: any[]) => {
            if (entries.length === 0) {
              // No more entries, we're done with this directory
              resolve();
            } else {
              // Process all entries in this batch
              const promises = entries.map(entry => 
                traverseFileTree(entry, path + item.name + '/', files)
              );
              Promise.all(promises).then(() => {
                // Continue reading in case there are more entries
                readEntries();
              });
            }
          });
        };
        
        readEntries();
      } else {
        resolve();
      }
    });
  };

  // Handle native drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const filesWithPaths = await processFilesFromDataTransfer(e.dataTransfer);
    
    if (filesWithPaths.length === 0) return;

    console.log(`Processing ${filesWithPaths.length} files from multiple folders`);

    const newUploads = filesWithPaths.map(({ file, relativePath }) => ({
      file,
      relativePath,
      progress: 0,
      uploading: true,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload all files concurrently with progress tracking
    const uploadPromises = filesWithPaths.map(async ({ file, relativePath }) => {
      // Simulate progress for each file
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map((upload) => 
            upload.file === file 
              ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
              : upload
          )
        );
      }, 200);

      const success = await uploadFile(file, relativePath);
      
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
        }, 1000);
      }

      return success;
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(Boolean).length;
    
    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} file(s) from multiple folders`,
      });
      onUploadSuccess();
    }
  };

  // Fallback for react-dropzone (individual files)
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('React-dropzone files (individual files only):', acceptedFiles.length);
    
    const newUploads = acceptedFiles.map(file => ({
      file,
      relativePath: file.name,
      progress: 0,
      uploading: true,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (const file of acceptedFiles) {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map((upload) => 
            upload.file === file 
              ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
              : upload
          )
        );
      }, 200);

      const success = await uploadFile(file, file.name);
      
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

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true, // Disable click on the dropzone, we'll handle it separately
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

  const handleMultipleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Multiple folder input files:', files.length);
    
    // Group files by their top-level folder
    const folderGroups = new Map<string, Array<{ file: File; relativePath: string }>>();
    
    files.forEach(file => {
      const relativePath = file.webkitRelativePath || file.name;
      const topLevelFolder = relativePath.split('/')[0];
      
      if (!folderGroups.has(topLevelFolder)) {
        folderGroups.set(topLevelFolder, []);
      }
      folderGroups.get(topLevelFolder)!.push({ file, relativePath });
    });
    
    console.log(`Processing ${folderGroups.size} folders with ${files.length} total files`);
    
    if (files.length > 0) {
      const filesWithPaths = files.map(file => ({
        file,
        relativePath: file.webkitRelativePath || file.name
      }));

      const newUploads = filesWithPaths.map(({ file, relativePath }) => ({
        file,
        relativePath,
        progress: 0,
        uploading: true,
      }));

      setUploadingFiles(prev => [...prev, ...newUploads]);

      // Upload all files concurrently
      const uploadPromises = filesWithPaths.map(async ({ file, relativePath }) => {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map((upload) => 
              upload.file === file 
                ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
                : upload
            )
          );
        }, 200);

        const success = await uploadFile(file, relativePath);
        
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
          }, 1000);
        }

        return success;
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        toast({
          title: "Upload Complete", 
          description: `Successfully uploaded ${successCount} file(s) from ${folderGroups.size} folder(s)`,
        });
        onUploadSuccess();
      }
    }
    
    // Reset the input value to allow selecting the same folders again
    event.target.value = '';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onDrop(files);
    }
    event.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div
          ref={dropzoneRef}
          {...getRootProps()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-8 text-center cursor-pointer ${
            isDragOver ? 'bg-blue-50 border-blue-400' : ''
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDragOver ? 'Drop files or folders here' : 'Upload files or multiple folders'}
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop multiple files or folders here, or click to select
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports: PDF, Word, Excel, PowerPoint, Text, and Images
          </p>
          <div className="flex items-center justify-center space-x-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Button type="button" className="mt-4">
                <FileText className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <label htmlFor="folder-upload" className="cursor-pointer">
              <Button type="button" variant="outline" className="mt-4">
                <FolderOpen className="h-4 w-4 mr-2" />
                Choose Multiple Folders
              </Button>
              <input
                id="folder-upload"
                type="file"
                {...({ webkitdirectory: "" } as any)}
                multiple
                onChange={handleMultipleFolderUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Card>

      {uploadingFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Uploading Files ({uploadingFiles.length})</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {uploadingFiles.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {upload.relativePath}
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
