import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SimpleFileManager } from '@/components/files/SimpleFileManager';
import { FloatingChatManager } from '@/components/chat/FloatingChatManager';
import { useFloatingChat } from '@/components/chat/FloatingChatManager';

const ProjectFiles = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const { openFloatingChat } = useFloatingChat();

  if (!projectId) return null;

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Project Files" 
            projectId={projectId}
          />
          
          <div className="flex-1">
            <SimpleFileManager 
              projectId={projectId} 
              refreshKey={refreshKey}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectFiles;