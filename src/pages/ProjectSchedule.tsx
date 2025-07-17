
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DHtmlxGanttChart } from "@/components/schedule/DHtmlxGanttChart";
import { AddTaskModal } from "@/components/schedule/AddTaskModal";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

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

  const {
    tasks,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    isCreating
  } = useProjectSchedule(projectId || '');

  const handleCreateTask = (taskData: any) => {
    console.log('handleCreateTask called with:', taskData);
    if (!projectId) {
      console.log('No projectId available');
      return;
    }
    
    console.log('Calling createTask with projectId:', projectId);
    createTask({
      ...taskData,
      project_id: projectId
    });
    setIsAddTaskOpen(false);
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
  };

  const handleEditTask = (task: any) => {
    // TODO: Implement edit modal
    console.log('Edit task:', task);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

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
              <Button onClick={() => setIsAddTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>

            {tasksLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading schedule...</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-6">
                <DHtmlxGanttChart
                  tasks={tasks || []}
                  onTaskUpdate={(taskId, updates) => updateTask({ taskId, updates })}
                  onTaskDelete={handleDeleteTask}
                />
              </div>
            )}
          </div>

          <AddTaskModal
            open={isAddTaskOpen}
            onOpenChange={setIsAddTaskOpen}
            onSubmit={handleCreateTask}
            isLoading={isCreating}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
