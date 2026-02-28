import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, FolderOpen, Archive, FolderPlus } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SimpleFileManager, SimpleFileManagerHandle } from '@/components/files/SimpleFileManager';
import { UniversalFilePreviewProvider } from '@/components/files/UniversalFilePreviewProvider';
import { Button } from '@/components/ui/button';

const ProjectFiles = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const fileManagerRef = useRef<SimpleFileManagerHandle>(null);

  if (!projectId) return null;

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const headerButtons = (
    <div className="flex items-center space-x-2">
      <Button type="button" variant="outline" size="sm" onClick={() => fileManagerRef.current?.triggerFileUpload()}>
        <FileText className="h-4 w-4 mr-2" />
        Choose Files
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => fileManagerRef.current?.triggerFolderUpload()}>
        <FolderOpen className="h-4 w-4 mr-2" />
        Choose Folder
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => fileManagerRef.current?.triggerZipUpload()}>
        <Archive className="h-4 w-4 mr-2" />
        Choose Zip File
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => fileManagerRef.current?.triggerCreateFolder()}>
        <FolderPlus className="h-4 w-4 mr-2" />
        Create Folder
      </Button>
    </div>
  );

  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader 
              title="Files" 
              subtitle="Manage and organize project documents."
              projectId={projectId}
              headerAction={headerButtons}
            />
            
            <div className="flex-1 px-6 pb-6">
              <SimpleFileManager
                ref={fileManagerRef}
                projectId={projectId} 
                refreshKey={refreshKey}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
};

export default ProjectFiles;
