import React from 'react';
import { useParams } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SimpleFileManager } from '@/components/files/SimpleFileManager';

const ProjectFiles = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Project Files" 
          />
          
          <div className="flex-1">
            <SimpleFileManager projectId={projectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ProjectFiles;