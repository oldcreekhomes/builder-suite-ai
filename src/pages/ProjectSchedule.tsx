
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GanttChart } from "@/components/schedule/GanttChart";
import { AddTaskDialog } from "@/components/schedule/AddTaskDialog";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const { data: tasks, isLoading, refetch } = useProjectSchedule(projectId);

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Project Schedule</h2>
              <Button onClick={() => setIsAddTaskOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <p>Loading schedule...</p>
                  </div>
                ) : (
                  <GanttChart tasks={tasks || []} onTaskUpdate={refetch} />
                )}
              </CardContent>
            </Card>
          </div>

          <AddTaskDialog
            projectId={projectId}
            open={isAddTaskOpen}
            onOpenChange={setIsAddTaskOpen}
            onTaskAdded={refetch}
            existingTasks={tasks || []}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
