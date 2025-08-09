import { useParams } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  User, 
  Calendar, 
  MapPin,
  CheckCircle,
  FileText,
  Image,
  DollarSign,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FloatingChatManager, useFloatingChat } from "@/components/chat/FloatingChatManager";

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { registerChatManager, openFloatingChat } = useFloatingChat();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset>
          <DashboardHeader title="Loading..." />
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="text-center">Loading project details...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!project) {
    return (
      <SidebarProvider>
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset>
          <DashboardHeader title="Project Not Found" />
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="text-center">Project not found</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const quickActions = [
    {
      title: "Project Files",
      description: "View and manage project documents",
      icon: FileText,
      action: () => navigate(`/project/${projectId}/files`),
      color: "blue"
    },
    {
      title: "Project Photos",
      description: "Browse project photo gallery",
      icon: Image,
      action: () => navigate(`/project/${projectId}/photos`),
      color: "green"
    },
    {
      title: "Project Budget",
      description: "Review budget and cost tracking",
      icon: DollarSign,
      action: () => navigate(`/project/${projectId}/budget`),
      color: "yellow"
    },
    {
      title: "Project Bidding",
      description: "Manage bids and contractors",
      icon: Users,
      action: () => navigate(`/project/${projectId}/bidding`),
      color: "purple"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under Construction':
        return 'bg-orange-100 text-orange-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Design':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <SidebarProvider>
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset>
          <DashboardHeader title={project.address || "Project Details"} />
          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Project Overview Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription className="flex items-center space-x-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{project.address}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Project Manager</p>
                      <p className="text-sm text-muted-foreground">
                        {project.manager || "Not assigned"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6" onClick={action.action}>
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className={`p-3 rounded-full ${
                        action.color === 'blue' ? 'bg-blue-100' :
                        action.color === 'green' ? 'bg-green-100' :
                        action.color === 'yellow' ? 'bg-yellow-100' :
                        action.color === 'purple' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        <action.icon className={`h-6 w-6 ${
                          action.color === 'blue' ? 'text-blue-600' :
                          action.color === 'green' ? 'text-green-600' :
                          action.color === 'yellow' ? 'text-yellow-600' :
                          action.color === 'purple' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Project Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Project Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Current Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <FloatingChatManager onOpenChat={registerChatManager} />
    </>
  );
}