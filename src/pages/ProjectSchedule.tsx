
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";

import { Calendar, Users, BarChart3, Settings, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useEnhancedProjectSchedule } from "@/hooks/useEnhancedProjectSchedule";
import { SyncfusionGantt } from "@/components/schedule/SyncfusionGantt";
import { ResourceManagement } from "@/components/schedule/ResourceManagement";
import { CalendarView } from "@/components/schedule/CalendarView";
import { DependencyManager } from "@/components/schedule/DependencyManager";

export default function ProjectSchedule() {
  const { projectId } = useParams();
  const [selectedView, setSelectedView] = useState<'gantt' | 'calendar' | 'resources' | 'dependencies'>('gantt');

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
    dependencies,
    resources,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
    createLink,
    deleteLink,
    createResource,
    isCreating
  } = useEnhancedProjectSchedule(projectId || '');

  const handleCreateTask = async (taskData: any) => {
    try {
      if (!projectId) {
        throw new Error('No project ID available');
      }
      
      await createTask({
        ...taskData,
        project_id: projectId
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const handleUpdateTask = (taskId: string, updates: any) => {
    updateTask({ taskId, updates });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleCreateLink = async (linkData: any) => {
    await createLink(linkData);
  };

  const handleDeleteLink = (linkId: string) => {
    deleteLink(linkId);
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
              <h2 className="text-2xl font-bold tracking-tight">Professional Project Schedule</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant={selectedView === 'gantt' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedView('gantt')}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Gantt
                </Button>
                <Button 
                  variant={selectedView === 'resources' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedView('resources')}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Resources
                </Button>
                <Button 
                  variant={selectedView === 'dependencies' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedView('dependencies')}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Dependencies
                </Button>
                <Button 
                  variant={selectedView === 'calendar' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedView('calendar')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
              </div>
            </div>

            {tasksLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading professional schedule...</div>
              </div>
            ) : selectedView === 'gantt' ? (
              <div className="bg-background rounded-lg border">
                <SyncfusionGantt
                  tasks={tasks || []}
                  dependencies={dependencies || []}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onCreateLink={handleCreateLink}
                  onDeleteLink={handleDeleteLink}
                  isLoading={tasksLoading}
                />
              </div>
            ) : selectedView === 'resources' ? (
              <ResourceManagement projectId={projectId} />
            ) : selectedView === 'dependencies' ? (
              <DependencyManager projectId={projectId} />
            ) : selectedView === 'calendar' ? (
              <CalendarView projectId={projectId} />
            ) : (
              <div className="bg-background rounded-lg border p-6">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Project Reports</h3>
                  <p className="text-muted-foreground">
                    View progress reports, timeline analysis, and cost tracking.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {tasks.length} total tasks • {dependencies.length} dependencies
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
