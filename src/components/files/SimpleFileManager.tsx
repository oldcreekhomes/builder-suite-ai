import React, { useState } from 'react';
import { Upload, FolderPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SimpleFileList } from './SimpleFileList';
import { SimpleBreadcrumb } from './SimpleBreadcrumb';
import { FileUploadDropzone } from './FileUploadDropzone';
import { NewFolderModal } from './NewFolderModal';
import { supabase } from '@/integrations/supabase/client';

interface SimpleFileManagerProps {
  projectId: string;
}

export const SimpleFileManager: React.FC<SimpleFileManagerProps> = ({ projectId }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const { user } = useAuth();
  const { data: allFiles = [], refetch } = useProjectFiles(projectId);

  // Get files and folders for current path (filter out folderkeeper files)
  const getCurrentItems = () => {
    const folders = new Set<string>();
    const files: any[] = [];

    allFiles.filter(file => file.file_type !== 'folderkeeper').forEach(file => {
      const filePath = file.original_filename;
      
      if (currentPath) {
        // We're in a subfolder
        if (!filePath.startsWith(currentPath + '/')) return;
        
        const remainingPath = filePath.substring(currentPath.length + 1);
        const nextSlash = remainingPath.indexOf('/');
        
        if (nextSlash === -1) {
          // It's a file in current folder
          if (!searchQuery || remainingPath.toLowerCase().includes(searchQuery.toLowerCase())) {
            files.push({ ...file, displayName: remainingPath });
          }
        } else {
          // It's a subfolder
          const folderName = remainingPath.substring(0, nextSlash);
          if (!searchQuery || folderName.toLowerCase().includes(searchQuery.toLowerCase())) {
            folders.add(folderName);
          }
        }
      } else {
        // We're at root
        const firstSlash = filePath.indexOf('/');
        
        if (firstSlash === -1) {
          // Root level file
          if (!searchQuery || filePath.toLowerCase().includes(searchQuery.toLowerCase())) {
            files.push({ ...file, displayName: filePath });
          }
        } else {
          // Root level folder
          const folderName = filePath.substring(0, firstSlash);
          if (!searchQuery || folderName.toLowerCase().includes(searchQuery.toLowerCase())) {
            folders.add(folderName);
          }
        }
      }
    });

    return {
      folders: Array.from(folders).map(name => ({
        name,
        path: currentPath ? `${currentPath}/${name}` : name
      })),
      files
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
    toast.success('File uploaded successfully');
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user) return;

    try {
      const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      // Create a folderkeeper file to represent the folder
      const folderKeeperContent = new Blob([''], { type: 'text/plain' });
      const folderKeeperFile = new File([folderKeeperContent], '.folderkeeper', { type: 'text/plain' });
      
      const fileName = `${folderPath}/.folderkeeper`;
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(`${projectId}/${fileName}`, folderKeeperFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          filename: '.folderkeeper',
          original_filename: fileName,
          file_type: 'folderkeeper',
          mime_type: 'text/plain',
          file_size: 0,
          storage_path: `${projectId}/${fileName}`,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      refetch();
      toast.success('Folder created successfully');
      setShowNewFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 border-b">
        <SimpleBreadcrumb 
          currentPath={currentPath} 
          onPathClick={handleBreadcrumbClick} 
        />
        
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowNewFolderModal(true)}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="p-4 border-b">
        <FileUploadDropzone
          projectId={projectId}
          currentPath={currentPath}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        <SimpleFileList
          folders={folders}
          files={files}
          onFolderClick={handleFolderClick}
          onRefresh={refetch}
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
