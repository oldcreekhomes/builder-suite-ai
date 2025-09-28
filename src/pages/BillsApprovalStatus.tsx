import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProjectManagers } from "@/hooks/useProjectManagers";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillsApprovalStatus() {
  const { projectId } = useParams();
  const { data: projectManagersData, isLoading } = useProjectManagers();
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [jobApprovals, setJobApprovals] = useState<Record<string, boolean>>({});

  // Set the first manager as selected when data loads
  useEffect(() => {
    if (projectManagersData?.managers && projectManagersData.managers.length > 0 && !selectedManagerId) {
      setSelectedManagerId(projectManagersData.managers[0].id);
    }
  }, [projectManagersData, selectedManagerId]);

  // Load approvals from localStorage on mount
  useEffect(() => {
    const savedApprovals = localStorage.getItem('accountingJobApprovals');
    if (savedApprovals) {
      setJobApprovals(JSON.parse(savedApprovals));
    }
  }, []);

  // Save approvals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('accountingJobApprovals', JSON.stringify(jobApprovals));
  }, [jobApprovals]);

  const handleApprovalChange = (jobId: string, isApproved: boolean) => {
    setJobApprovals(prev => ({
      ...prev,
      [jobId]: isApproved
    }));
  };

  const isJobApproved = (jobId: string) => {
    return jobApprovals[jobId] || false;
  };

  // Get projects for the selected manager
  const selectedManagerProjects = selectedManagerId && projectManagersData?.projectsByManager 
    ? projectManagersData.projectsByManager[selectedManagerId] || []
    : [];

  // Calculate company-wide statistics across all managers
  const allProjects = projectManagersData?.projectsByManager 
    ? Object.values(projectManagersData.projectsByManager).flat()
    : [];

  const summaryStats = {
    totalApproved: allProjects.filter(project => isJobApproved(project.id)).length,
    totalUnapproved: allProjects.filter(project => !isJobApproved(project.id)).length,
    totalJobs: allProjects.length
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader 
              title="Bills - Approval Status" 
              projectId={projectId}
            />
            <div className="flex-1 p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4 text-center">
                        <Skeleton className="h-8 w-16 mx-auto mb-2" />
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <div className="p-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      );
    }

    if (!projectManagersData?.managers || projectManagersData.managers.length === 0) {
      return (
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <SidebarInset className="flex-1">
              <DashboardHeader 
                title="Bills - Approval Status" 
                projectId={projectId}
              />
              <div className="flex-1 p-6 space-y-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No project managers found. Assign managers to projects to use the invoice dashboard.</p>
                </div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      );
    }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Bills - Approval Status" 
            projectId={projectId}
          />
          <div className="flex-1 p-6 space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalJobs}</div>
                  <div className="text-sm text-muted-foreground">Total Jobs</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalUnapproved}</div>
                  <div className="text-sm text-muted-foreground">Unapproved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{summaryStats.totalApproved}</div>
                  <div className="text-sm text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
            </div>

            {/* Jobs Table with Manager Tabs */}
            <Card>
              <Tabs value={selectedManagerId} onValueChange={setSelectedManagerId} className="w-full">
                <div className="p-4 border-b">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(projectManagersData.managers.length, 4)}, minmax(0, 1fr))` }}>
                    {projectManagersData.managers.map((manager) => (
                      <TabsTrigger 
                        key={manager.id} 
                        value={manager.id}
                        className="flex items-center gap-2"
                      >
                        <span className="truncate">
                          {manager.first_name || manager.email}
                        </span>
                        {manager.project_count > 0 && (
                          <div className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                            {manager.project_count}
                          </div>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {projectManagersData.managers.map((manager) => (
                  <TabsContent key={manager.id} value={manager.id} className="m-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Project Name</TableHead>
                          <TableHead className="text-center">Invoice Status</TableHead>
                          <TableHead className="text-center">Approval Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedManagerProjects.length > 0 ? (
                          selectedManagerProjects.map((project) => {
                            const approved = isJobApproved(project.id);
                            return (
                              <TableRow 
                                key={project.id} 
                                className={`hover:bg-muted/50 ${approved ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-muted'}`}
                              >
                                <TableCell className="font-medium text-foreground">{project.address}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={approved}
                                      onCheckedChange={(checked) => handleApprovalChange(project.id, checked as boolean)}
                                      className="w-4 h-4"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm font-medium text-foreground">
                                    {approved ? 'Approved' : 'Unapproved'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No projects assigned to this manager
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}