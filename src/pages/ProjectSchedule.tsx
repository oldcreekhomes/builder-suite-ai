
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
            title="Schedule" 
            subtitle="View and manage the project timeline."
            projectId={projectId}
          />
          
          <div className="flex-1 flex flex-col p-6 overflow-hidden">

            <CustomGanttChart projectId={projectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
