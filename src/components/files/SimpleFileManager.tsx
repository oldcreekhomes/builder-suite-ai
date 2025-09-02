import React, { useState, useRef } from 'react';
import { FolderPlus, FileText, FolderOpen, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SimpleFileList } from './SimpleFileList';
import { SimpleBreadcrumb } from './SimpleBreadcrumb';
import { NewFolderModal } from './NewFolderModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface SimpleFileManagerProps {
  projectId: string;
  refreshKey?: number;
  onUploadSuccess?: () => void;
}

export const SimpleFileManager: React.FC<SimpleFileManagerProps> = ({ 
  projectId, 
  refreshKey,
  onUploadSuccess
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [processingZip, setProcessingZip] = useState(false);
  const { user } = useAuth();
  const { toast: useToastHook } = useToast();
  const { data: allFiles = [], refetch } = useProjectFiles(projectId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Trigger refetch when refreshKey changes
  React.useEffect(() => {
    if (refreshKey) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Get files and folders for current path (filter out folderkeeper files)
  const getCurrentItems = () => {
    const folders = new Set<string>();
    const files: any[] = [];

    allFiles.forEach(file => {
      const filePath = file.original_filename;
      
      if (currentPath) {
        // We're in a subfolder
        if (!filePath.startsWith(currentPath + '/')) return;
        
        const remainingPath = filePath.substring(currentPath.length + 1);
        const nextSlash = remainingPath.indexOf('/');
        
        if (nextSlash === -1) {
          // It's a file in current folder (skip folderkeeper files)
          if (file.file_type !== 'folderkeeper') {
            files.push({ 
              ...file, 
              displayName: remainingPath,
              original_filename: file.original_filename 
            });
          }
        } else {
          // It's a subfolder or folderkeeper file
          const folderName = remainingPath.substring(0, nextSlash);
          folders.add(folderName);
        }
      } else {
        // We're at root
        const firstSlash = filePath.indexOf('/');
        
        if (firstSlash === -1) {
          // Root level file (skip folderkeeper files)
          if (file.file_type !== 'folderkeeper') {
            files.push({ 
              ...file, 
              displayName: filePath,
              original_filename: file.original_filename 
            });
          }
        } else {
          // Root level folder or folderkeeper file
          const folderName = filePath.substring(0, firstSlash);
          folders.add(folderName);
        }
      }
    });

    // Sort folders alphabetically (case-insensitive)
    const sortedFolders = Array.from(folders)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(name => ({
        name,
        path: currentPath ? `${currentPath}/${name}` : name
      }));

    // Sort files alphabetically by display name (case-insensitive)
    const sortedFiles = files.sort((a, b) => 
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );

    return {
      folders: sortedFolders,
      files: sortedFiles
    };
  };

  const { folders, files } = getCurrentItems();

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  const handleUploadSuccess = () => {
    refetch();
    if (onUploadSuccess) {
      onUploadSuccess();
    }
    toast.success('File uploaded successfully');
  };

  // File upload helpers
  const isValidFile = (file: File) => {
    const fileName = file.name;
    const systemFiles = ['.DS_Store', 'Thumbs.db'];
    const hiddenFiles = fileName.startsWith('.');

    if (fileName === '.gitignore' || fileName === '.gitkeep') {
      return true;
    }

    if (systemFiles.includes(fileName) || hiddenFiles && fileName !== '.gitignore' && fileName !== '.gitkeep') {
      return false;
    }

    if (file.size === 0) {
      return false;
    }
    return true;
  };

  const uploadFile = async (file: File, relativePath: string = '') => {
    if (!user) return false;
    const fileId = crypto.randomUUID();
    const fileName = `${projectId}/${fileId}_${relativePath || file.name}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const originalFilename = currentPath ? `${currentPath}/${relativePath || file.name}` : relativePath || file.name;

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
      useToastHook({
        title: "Upload Error",
        description: `Failed to upload ${relativePath || file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(isValidFile);
    if (validFiles.length === 0) {
      useToastHook({
        title: "No Valid Files",
        description: "No valid files found to upload",
      });
      return;
    }

    for (const file of validFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      await uploadFile(file, relativePath);
    }

    useToastHook({
      title: "Upload Complete",
      description: `Successfully uploaded ${validFiles.length} file(s)`,
    });

    handleUploadSuccess();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    event.target.value = '';
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    event.target.value = '';
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const zipFile = files[0];
    if (!zipFile || !zipFile.name.endsWith('.zip')) {
      useToastHook({
        title: "Invalid File",
        description: "Please select a valid .zip file",
        variant: "destructive",
      });
      return;
    }
    await processZipFile(zipFile);
    event.target.value = '';
  };

  const processZipFile = async (zipFile: File) => {
    if (!user) return;
    setProcessingZip(true);
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(zipFile);
      const extractedFiles: File[] = [];

      for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
        if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('.DS_Store')) {
          continue;
        }
        
        try {
          const blob = await zipEntry.async('blob');
          const file = new File([blob], relativePath.split('/').pop() || relativePath, {
            type: blob.type || 'application/octet-stream'
          });

          Object.defineProperty(file, 'webkitRelativePath', {
            value: relativePath,
            writable: false
          });
          
          extractedFiles.push(file);
        } catch (error) {
          console.error(`Error extracting file ${relativePath}:`, error);
        }
      }

      if (extractedFiles.length === 0) {
        useToastHook({
          title: "No Files Found",
          description: "No valid files found in the zip archive",
          variant: "destructive",
        });
        return;
      }

      await processFiles(extractedFiles);
    } catch (error) {
      console.error('Zip processing error:', error);
      useToastHook({
        title: "Zip Processing Error",
        description: "Failed to process the zip file",
        variant: "destructive",
      });
    } finally {
      setProcessingZip(false);
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;

    try {
      // Trim and validate folder name
      const trimmedFolderName = folderName.trim();
      if (!trimmedFolderName) {
        toast.error('Folder name cannot be empty');
        return;
      }
      
      if (trimmedFolderName.includes('/') || trimmedFolderName.includes('\\')) {
        toast.error('Folder name cannot contain slashes');
        return;
      }

      const folderPath = currentPath ? `${currentPath}/${trimmedFolderName}` : trimmedFolderName;
      
      // Check if folder already exists by looking for:
      // 1. Files with this exact folder path (existing files in the folder)
      // 2. Folderkeeper file for this folder
      const { data: existingFiles } = await supabase
        .from('project_files')
        .select('id, original_filename, file_type')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .eq('original_filename', `${folderPath}/.folderkeeper`);

      if (existingFiles && existingFiles.length > 0) {
        toast.error('A folder with this name already exists');
        return;
      }

      // Also check if there are any files in this folder path
      const { data: folderFiles } = await supabase
        .from('project_files')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', `${folderPath}/%`)
        .limit(1);

      if (folderFiles && folderFiles.length > 0) {
        toast.error('A folder with this name already exists');
        return;
      }

      // Also check if the storage file exists (in case DB record is missing)
      const folderKeeperPath = `${projectId}/${folderPath}/.folderkeeper`;
      const { data: storageCheck } = await supabase.storage
        .from('project-files')
        .list(projectId, {
          search: `${folderPath}/.folderkeeper`
        });

      if (storageCheck && storageCheck.length > 0) {
        toast.error('A folder with this name already exists');
        return;
      }
      
      // Create a folderkeeper file to represent the folder
      const folderKeeperContent = new Blob([''], { type: 'text/plain' });
      const folderKeeperFile = new File([folderKeeperContent], '.folderkeeper', { type: 'text/plain' });
      
      const fileName = `${folderPath}/.folderkeeper`;
      const storageFileName = `${projectId}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storageFileName, folderKeeperFile, {
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message?.includes('already exists') || uploadError.message?.includes('duplicate')) {
          toast.error('A folder with this name already exists');
        } else {
          toast.error(`Failed to create folder: ${uploadError.message}`);
        }
        return;
      }

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: storageFileName,
          original_filename: fileName,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          file_size: 0,
          storage_path: uploadData.path,
          uploaded_by: user.id,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Try to clean up the storage file if DB insert failed
        await supabase.storage.from('project-files').remove([storageFileName]);
        toast.error(`Failed to create folder: ${dbError.message}`);
        return;
      }

      refetch();
      toast.success('Folder created successfully');
      setShowNewFolderModal(false);
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb Navigation with Upload Buttons */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <SimpleBreadcrumb 
          currentPath={currentPath} 
          onPathClick={handleBreadcrumbClick} 
        />
        
        <div className="flex items-center space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose Folder
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => zipInputRef.current?.click()}
            disabled={processingZip}
          >
            <Archive className="h-4 w-4 mr-2" />
            {processingZip ? "Processing..." : "Choose Zip File"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowNewFolderModal(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
        </div>
      </div>

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
        {...{ webkitdirectory: "" } as any} 
        multiple 
        onChange={handleFolderUpload} 
        className="hidden" 
      />
      <input 
        ref={zipInputRef} 
        type="file" 
        accept=".zip" 
        onChange={handleZipUpload} 
        className="hidden" 
      />

      {/* File List */}
      <div className="flex-1 overflow-auto">
        <SimpleFileList
          folders={folders}
          files={files}
          onFolderClick={handleFolderClick}
          onRefresh={refetch}
          projectId={projectId}
          currentPath={currentPath}
          onCreateFolder={handleCreateFolder}
        />
      </div>

      {/* Modals */}
      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
        parentPath={currentPath}
      />
    </div>
  );
};
