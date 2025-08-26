
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiddingTable } from "@/components/bidding/BiddingTable";
import { FloatingChatManager } from "@/components/chat/FloatingChatManager";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Project Bidding" 
            projectId={projectId}
          />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Tabs defaultValue="draft" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="draft" className="mt-6">
                <BiddingTable 
                  projectId={projectId} 
                  projectAddress={project?.address}
                  status="draft"
                />
              </TabsContent>
              
              <TabsContent value="sent" className="mt-6">
                <BiddingTable 
                  projectId={projectId} 
                  projectAddress={project?.address}
                  status="sent"
                />
              </TabsContent>
              
              <TabsContent value="closed" className="mt-6">
                <BiddingTable 
                  projectId={projectId} 
                  projectAddress={project?.address}
                  status="closed"
                />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
