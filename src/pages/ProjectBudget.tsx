
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function ProjectBudget() {
  const { projectId } = useParams();

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
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            projectId={projectId}
          />
          
          <main className="flex-1 space-y-4 p-4 md:p-6 pt-6">
            <UniversalFilePreviewProvider>
              <BudgetTable 
                projectId={projectId} 
                projectAddress={project?.address}
              />
            </UniversalFilePreviewProvider>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
