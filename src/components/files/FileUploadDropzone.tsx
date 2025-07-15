import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FileOperationsContextMenu } from "./FileOperationsContextMenu";
import { NewFolderModal } from "./NewFolderModal";

interface FileUploadDropzoneProps {
  projectId: string;
  onUploadSuccess: () => void;
}

export function FileUploadDropzone({ projectId, onUploadSuccess }: FileUploadDropzoneProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    uploading: boolean;
    relativePath: string;
  }>>([]);

  // Filter out system files and unwanted files
  const isValidFile = (file: File, relativePath: string = '') => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db', '.gitkeep', '.gitignore'];
    const hiddenFiles = fileName.startsWith('.');
    
    // Allow .gitignore and .gitkeep as they're legitimate files
    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }
    
    // Filter out system files and other hidden files
    if (systemFiles.includes(fileName) || (hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep')) {
      return false;
    }
    
    return true;
  };

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

  const processFilesFromDataTransfer = async (dataTransfer: DataTransfer) => {
    const files: Array<{ file: File; relativePath: string }> = [];
    
    const items = Array.from(dataTransfer.items);
    console.log('🔍 Processing drag and drop with', items.length, 'items');
    
    // Process all items concurrently to handle multiple folders
    const promises = items.map(async (item) => {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          console.log('📁 Processing entry:', entry.name, 'isDirectory:', entry.isDirectory);
          await traverseFileTree(entry, '', files);
        } else {
          // Fallback for browsers that don't support webkitGetAsEntry
          const file = item.getAsFile();
          if (file && isValidFile(file)) {
            console.log('📄 Adding loose file:', file.name);
            files.push({ file, relativePath: file.name });
          }
        }
      }
    });
    
    await Promise.all(promises);
    
    // Filter out invalid files and return clean paths
    const validFiles = files.filter(({ file, relativePath }) => isValidFile(file, relativePath));
    
    console.log('✅ Final file paths from drag and drop:');
    validFiles.forEach(f => console.log('  -', f.relativePath));
    
    return validFiles;
  };

  const traverseFileTree = (item: any, currentPath: string, files: Array<{ file: File; relativePath: string }>) => {
    return new Promise<void>((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          const fullPath = currentPath + file.name;
          console.log('📄 File found:', fullPath);
          if (isValidFile(file, fullPath)) {
            files.push({ file, relativePath: fullPath });
          }
          resolve();
        });
      } else if (item.isDirectory) {
        console.log('📁 Entering directory:', item.name, 'currentPath:', currentPath);
        const dirReader = item.createReader();
        
        const readEntries = () => {
          dirReader.readEntries((entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              const newPath = currentPath + item.name + '/';
              console.log('🔄 Directory path will be:', newPath);
              const promises = entries.map(entry => 
                traverseFileTree(entry, newPath, files)
              );
              Promise.all(promises).then(() => {
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
    
    if (filesWithPaths.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload (system files like .DS_Store are filtered out)",
      });
      return;
    }

    console.log(`Processing ${filesWithPaths.length} valid files from nested folder structure`);

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
        description: `Successfully uploaded ${successCount} file(s) with folder structure preserved`,
      });
      onUploadSuccess();
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('React-dropzone files (individual files only):', acceptedFiles.length);
    
    // Filter out system files
    const validFiles = acceptedFiles.filter(file => isValidFile(file));
    
    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload (system files like .DS_Store are filtered out)",
      });
      return;
    }

    const newUploads = validFiles.map(file => ({
      file,
      relativePath: file.name, // Just use filename directly for loose files
      progress: 0,
      uploading: true,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (const file of validFiles) {
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

      // Store loose files with just the filename (no prefix)
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
    
    // Simple Google Drive approach: Use webkitRelativePath as-is
    const filesWithPaths = files
      .filter(file => isValidFile(file, file.webkitRelativePath))
      .map(file => ({
        file,
        relativePath: file.webkitRelativePath || file.name
      }));

    if (filesWithPaths.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload",
      });
      event.target.value = '';
      return;
    }

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
    
    // Count unique top-level folders by looking at the paths
    const uniqueTopFolders = new Set(
      filesWithPaths
        .map(f => f.relativePath.split('/')[0])
        .filter(folder => folder !== '')
    );
    
    if (successCount > 0) {
      toast({
        title: "Upload Complete", 
        description: `Successfully uploaded ${successCount} file(s) from ${uniqueTopFolders.size} folder(s) with complete nested structure preserved`,
      });
      onUploadSuccess();
    }
    
    // Reset the input value to allow selecting the same folders again
    event.target.value = '';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => isValidFile(file));
    
    if (validFiles.length > 0) {
      onDrop(validFiles);
    }
    event.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleContextFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleContextFolderUpload = () => {
    folderInputRef.current?.click();
  };

  const createFolderPlaceholder = async (folderName: string) => {
    if (!user) return false;

    try {
      // Create a placeholder file in the folder to make it visible
      const placeholderContent = new Blob([''], { type: 'text/plain' });
      const placeholderFile = new File([placeholderContent], '.folderkeeper', {
        type: 'text/plain'
      });

      const fileId = crypto.randomUUID();
      const fileName = `${user.id}/${projectId}/${fileId}_${folderName}/.folderkeeper`;
      
      // Upload placeholder to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, placeholderFile);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: `${folderName}/.folderkeeper`,
          file_size: 0,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          storage_path: uploadData.path,
          uploaded_by: user.id,
          description: 'Folder placeholder'
        });

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      return false;
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    const success = await createFolderPlaceholder(folderName);
    
    if (success) {
      toast({
        title: "Folder Created",
        description: `Folder "${folderName}" has been created successfully.`,
      });
      onUploadSuccess();
    } else {
      toast({
        title: "Error",
        description: `Failed to create folder "${folderName}".`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <FileOperationsContextMenu
          onNewFolder={handleNewFolder}
          onFileUpload={handleContextFileUpload}
          onFolderUpload={handleContextFolderUpload}
        >
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
              {isDragOver ? 'Drop files or folders here' : 'Upload files or nested folders'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here to upload them as loose files, or drop complete folder structures to preserve organization.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports: PDF, Word, Excel, PowerPoint, Text, and Images. System files (.DS_Store, etc.) are automatically filtered out.
            </p>
          </div>
        </FileOperationsContextMenu>
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

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}
