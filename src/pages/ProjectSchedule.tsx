
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { GanttChart } from "@/components/schedule/GanttChart";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";

export default function ProjectSchedule() {
  const { projectId } = useParams();
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
              <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
            </div>

            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <p>Loading schedule...</p>
                  </div>
                ) : (
                  <GanttChart tasks={tasks || []} onTaskUpdate={refetch} projectId={projectId} />
                )}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
