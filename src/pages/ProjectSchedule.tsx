
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CustomGanttChart } from "@/components/schedule/CustomGanttChart";
import { fixDuplicateResourceNames } from "@/utils/fixResourceNames";

export default function ProjectSchedule() {
  const { projectId } = useParams();

  // Run the resource name fix on component mount (one-time cleanup)
  useEffect(() => {
    fixDuplicateResourceNames().then(result => {
      if (result.success && result.updatedCount > 0) {
        console.log(`Fixed ${result.updatedCount} tasks with duplicate resource names`);
        // Refresh the page to show updated data
        window.location.reload();
      }
    });
  }, []);

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
