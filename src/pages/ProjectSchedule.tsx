
import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";

import { DashboardHeader } from "@/components/DashboardHeader";
import { CustomGanttChart } from "@/components/schedule/CustomGanttChart";

export default function ProjectSchedule() {
  const { projectId } = useParams();

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <DashboardHeader 
            title="Project Schedule" 
            projectId={projectId}
          />
          
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Schedule</h1>
              <p className="text-muted-foreground">View and manage the project timeline.</p>
            </div>

            <CustomGanttChart projectId={projectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
