
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BiddingTabs } from "@/components/bidding/BiddingTabs";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function ProjectBidding() {
  const { projectId } = useParams();
  const { openFloatingChat } = useFloatingChat();

  // Fetch project data to get the address
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      return data;
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar onStartChat={openFloatingChat} />
          <SidebarInset className="flex-1">
            <DashboardHeader 
              title="Bidding" 
              projectId={projectId}
            />
            
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
              <BiddingTabs 
                projectId={projectId} 
                projectAddress={project?.address}
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
}
