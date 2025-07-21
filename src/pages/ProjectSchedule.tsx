
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import GanttChart from "@/components/GanttChart";

export default function ProjectSchedule() {
  const { projectId } = useParams();

  // Dynamically load Syncfusion CSS only for this page
  useEffect(() => {
    const loadSyncfusionCSS = async () => {
      // Import Syncfusion CSS dynamically
      await import('@syncfusion/ej2-base/styles/material.css');
      await import('@syncfusion/ej2-buttons/styles/material.css');
      await import('@syncfusion/ej2-calendars/styles/material.css');
      await import('@syncfusion/ej2-dropdowns/styles/material.css');
      await import('@syncfusion/ej2-inputs/styles/material.css');
      await import('@syncfusion/ej2-navigations/styles/material.css');
      await import('@syncfusion/ej2-popups/styles/material.css');
      await import('@syncfusion/ej2-splitbuttons/styles/material.css');
      await import('@syncfusion/ej2-layouts/styles/material.css');
      await import('@syncfusion/ej2-grids/styles/material.css');
      await import('@syncfusion/ej2-treegrid/styles/material.css');
      await import('@syncfusion/ej2-gantt/styles/material.css');
    };

    loadSyncfusionCSS();
  }, []);

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
            title={projectLoading ? "Loading..." : project?.address || "Project Address"} 
          />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Project Schedule</h2>
            </div>

            <div className="bg-background rounded-lg border" style={{ minWidth: '1000px', width: '100%' }}>
              <GanttChart projectId={projectId} />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
