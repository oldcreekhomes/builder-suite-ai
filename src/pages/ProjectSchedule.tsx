
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/useProject";
import "../styles/syncfusion.css";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const { data: project, isLoading: projectLoading } = useProject(projectId || "");

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="text-gray-600 hover:text-black" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-black">Project Schedule</h1>
                  {project?.address && (
                    <p className="text-sm text-gray-600">{project.address}</p>
                  )}
                </div>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6" />
              <h2 className="text-2xl font-bold tracking-tight">Schedule Overview</h2>
            </div>

            <div className="flex items-center justify-center min-h-[400px] bg-white border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Schedule Module</h3>
                <p className="text-gray-600 max-w-md">
                  Schedule functionality will be implemented here. This page is ready for a fresh start.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
