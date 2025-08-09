import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FolderOpen, FolderPlus, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { NewFolderModal } from "@/components/files/NewFolderModal";
interface FileUploadDropzoneProps {
  projectId: string;
  onUploadSuccess: () => void;
  currentPath?: string;
}

export function FileUploadDropzone({ projectId, onUploadSuccess, currentPath = '' }: FileUploadDropzoneProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    file: File;
    progress: number;
    uploading: boolean;
    isFolder: boolean;
    folderName: string | null;
  }>>([]);
  const [queuedFolders, setQueuedFolders] = useState<Array<{ id: string; rootName: string; files: File[]; totalFiles: number }>>([]);

  const uploadFile = async (file: File, relativePath: string = '') => {
    if (!user) return false;

    const fileId = crypto.randomUUID();
    const fileName = `${user.id}/${projectId}/${fileId}_${relativePath || file.name}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Calculate the correct original_filename for folder structure
      const originalFilename = currentPath ? `${currentPath}/${relativePath || file.name}` : (relativePath || file.name);
      
      console.log('=== UPLOADING FILE TO DATABASE ===');
      console.log('File name:', file.name);
      console.log('Relative path:', relativePath);
      console.log('Current path:', currentPath);
      console.log('Final original_filename:', originalFilename);

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: fileName,
          original_filename: originalFilename,
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
        description: `Failed to upload ${relativePath || file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const isValidFile = (file: File) => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db'];
    const hiddenFiles = fileName.startsWith('.');
    
    // Allow .gitignore and .gitkeep as they're legitimate files
    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }
    
    // Filter out system files and other hidden files
    if (systemFiles.includes(fileName) || (hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep')) {
      console.log('File rejected - system/hidden file:', fileName);
      return false;
    }
    
    // Filter out empty files
    if (file.size === 0) {
      console.log('File rejected - empty file:', fileName);
      return false;
    }
    
    return true;
  };

  const processFiles = async (files: File[]) => {
    console.log('=== PROCESSING FILES ===');
    console.log('Files:', files);
    console.log('Files with webkitRelativePath:', files.map(f => ({ 
      name: f.name, 
      webkitRelativePath: f.webkitRelativePath,
      size: f.size 
    })));
    
    // Filter out invalid files (system files, hidden files, empty files)
    const validFiles = files.filter(isValidFile);
    
    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "No valid files found to upload (system files like .DS_Store are filtered out)",
      });
      return;
    }

    if (validFiles.length < files.length) {
      console.log(`Filtered out ${files.length - validFiles.length} invalid files`);
    }
    
    // Check if any files have webkitRelativePath (indicating folder upload)
    const hasRelativePaths = validFiles.some(file => file.webkitRelativePath);
    console.log('Has relative paths (folder upload):', hasRelativePaths);

    const newUploads = validFiles.map(file => ({
      file,
      progress: 0,
      uploading: true,
      isFolder: hasRelativePaths && file.webkitRelativePath ? file.webkitRelativePath.includes('/') : false,
      folderName: hasRelativePaths && file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : null,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Get unique folder paths that need to be created
    const folderPaths = new Set<string>();
    
    if (hasRelativePaths) {
      validFiles.forEach(file => {
        if (file.webkitRelativePath) {
          const folderPath = file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/'));
          if (folderPath) {
            // Add all parent folders in the hierarchy
            const parts = folderPath.split('/');
            for (let i = 0; i < parts.length; i++) {
              const parentPath = parts.slice(0, i + 1).join('/');
              if (parentPath) {
                folderPaths.add(parentPath);
              }
            }
          }
        }
      });

      // Create folder keeper files for all detected folders
      console.log('Creating folders:', Array.from(folderPaths));
      for (const folderPath of folderPaths) {
        try {
          const keeperFileName = `${user?.id}/${projectId}/${crypto.randomUUID()}_${folderPath}/.folderkeeper`;
          const emptyFile = new Blob([''], { type: 'text/plain' });
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(keeperFileName, emptyFile);

          if (!uploadError) {
            await supabase
              .from('project_files')
              .insert({
                project_id: projectId,
                filename: keeperFileName,
                original_filename: currentPath ? `${currentPath}/${folderPath}/.folderkeeper` : `${folderPath}/.folderkeeper`,
                file_size: 0,
                file_type: 'folderkeeper',
                mime_type: 'text/plain',
                storage_path: uploadData.path,
                uploaded_by: user?.id,
                description: 'Folder placeholder',
              });
          }
        } catch (error) {
          console.error('Error creating folder:', folderPath, error);
        }
      }
    }

    // Upload all valid files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      
      // For folder uploads, use the full relative path. For individual files, just use filename
      let relativePath: string;
      if (hasRelativePaths && file.webkitRelativePath) {
        relativePath = file.webkitRelativePath;
        console.log('Using webkitRelativePath:', relativePath);
      } else {
        relativePath = file.name;
        console.log('Using filename:', relativePath);
      }
      
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
    }

    // Show success message
    const uniqueFolders = new Set<string>();
    if (hasRelativePaths) {
      validFiles.forEach(file => {
        if (file.webkitRelativePath) {
          const rootFolder = file.webkitRelativePath.split('/')[0];
          uniqueFolders.add(rootFolder);
        }
      });
    }
    
    const folderCount = uniqueFolders.size;
    let description = `Successfully uploaded ${validFiles.length} file(s)`;
    if (hasRelativePaths && folderCount > 0) {
      description += ` from ${folderCount} folder(s) with structure preserved`;
    }
    
    toast({
      title: "Upload Complete", 
      description,
    });

    // Call onUploadSuccess after all uploads complete
    onUploadSuccess();
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Folder files selected:', files);
    console.log('Files with webkitRelativePath:', files.map(f => ({ name: f.name, path: f.webkitRelativePath })));

    if (files.length > 0) {
      // Group files by their root folder (first segment of webkitRelativePath)
      const groups = new Map<string, File[]>();
      for (const file of files) {
        const root = file.webkitRelativePath ? file.webkitRelativePath.split('/')[0] : file.name;
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(file);
      }

      const additions = Array.from(groups.entries()).map(([rootName, groupFiles]) => ({
        id: crypto.randomUUID(),
        rootName,
        files: groupFiles,
        totalFiles: groupFiles.length,
      }));

      setQueuedFolders(prev => [...prev, ...additions]);

      toast({
        title: "Folder added",
        description: `Added ${additions.length} folder(s) to the upload queue`,
      });
    }

    // Reset input so the same folder can be selected again if needed
    event.target.value = '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    event.target.value = '';
  };

  const removeUpload = (file: File) => {
    setUploadingFiles(prev => prev.filter(upload => upload.file !== file));
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleChooseFolder = () => {
    folderInputRef.current?.click();
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;

    try {
      // Create a .folderkeeper file to represent the folder
      const keeperFileName = `${user.id}/${projectId}/${crypto.randomUUID()}_${folderName}/.folderkeeper`;
      
      // Create empty file content
      const emptyFile = new Blob([''], { type: 'text/plain' });
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(keeperFileName, emptyFile);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: keeperFileName,
          original_filename: currentPath ? `${currentPath}/${folderName}/.folderkeeper` : `${folderName}/.folderkeeper`,
          file_size: 0,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          storage_path: uploadData.path,
          uploaded_by: user.id,
          description: 'Folder placeholder',
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `Folder "${folderName}" created successfully`,
      });
      onUploadSuccess();
    } catch (error) {
      console.error('Folder creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleUploadQueuedFolders = async () => {
    const allFiles = queuedFolders.flatMap(q => q.files);
    if (allFiles.length === 0) return;
    await processFiles(allFiles);
    setQueuedFolders([]);
  };

  const handleClearQueue = () => setQueuedFolders([]);

  const removeQueuedFolderFromQueue = (id: string) => {
    setQueuedFolders(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="p-8 text-center">
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload files or folders
        </h3>
        <p className="text-gray-600 mb-4">
          Use the buttons below to upload individual files, entire folders, or create new folders.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Supports all file types: documents, images, videos, archives, and more
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Button type="button" variant="outline" onClick={handleChooseFiles}>
            <FileText className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
          <Button type="button" variant="outline" onClick={handleChooseFolder}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose Folder
          </Button>
          <Button type="button" variant="outline" onClick={handleNewFolder}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
        </div>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "" } as any)}
        multiple
        onChange={handleFolderUpload}
        className="hidden"
      />

      {queuedFolders.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Queued Folders</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClearQueue}>Clear</Button>
              <Button size="sm" onClick={handleUploadQueuedFolders}>
                <Upload className="h-4 w-4 mr-2" />
                Upload All
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {queuedFolders.map((q) => (
              <div key={q.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">{q.rootName}</span>
                  <span className="text-xs text-gray-500">({q.totalFiles} files)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeQueuedFolderFromQueue(q.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {uploadingFiles.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Uploading Files</h4>
          <div className="space-y-3">
            {uploadingFiles.map((upload, index) => (
              <div key={index} className="flex items-center space-x-3">
                {upload.isFolder ? (
                  <Folder className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {upload.file.webkitRelativePath || upload.file.name}
                      </span>
                      {upload.isFolder && upload.folderName && (
                        <span className="text-xs text-gray-500">
                          Folder: {upload.folderName}
                        </span>
                      )}
                    </div>
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
