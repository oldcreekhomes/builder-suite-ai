
import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CustomGanttChart } from "@/components/schedule/CustomGanttChart";
import { AddTaskDialog } from "@/components/schedule/AddTaskDialog";
import "../styles/syncfusion.css";

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
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6" />
              <h2 className="text-2xl font-bold tracking-tight">Schedule Overview</h2>
            </div>

            <CustomGanttChart projectId={projectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
