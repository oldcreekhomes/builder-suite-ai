import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, MapPin, Calendar, Plus, Edit } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Design": return "bg-yellow-100 text-yellow-800";
    case "Permitting": return "bg-blue-100 text-blue-800";
    case "Under Construction": return "bg-orange-100 text-orange-800";
    case "Completed": return "bg-green-100 text-green-800";
    case "Template": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getProgressValue = (status: string) => {
  switch (status) {
    case "In Design": return 15;
    case "Permitting": return 25;
    case "Under Construction": return 65;
    case "Completed": return 100;
    case "Template": return 0;
    default: return 0;
  }
};

const statusTabs = ["In Design", "Permitting", "Under Construction", "Completed", "Template"];

export function ProjectsOverview() {
  const { data: projects = [], isLoading } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleEditClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setEditingProject(project);
  };

  const handleDeleteClick = (projectId: string) => {
    deleteProjectMutation.mutate(projectId);
  };

  const filterProjectsByStatus = (status: string) => {
    return projects.filter(project => project.status === status);
  };

  const getProjectCount = (status: string) => {
    return filterProjectsByStatus(status).length;
  };

  const formatDateWithOrdinal = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMMM do, yyyy');
  };

  const renderProjectCard = (project: any) => {
    const progress = getProgressValue(project.status);
    
    return (
      <div 
        key={project.id} 
        className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => handleProjectClick(project.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-black text-lg">{project.name}</h3>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {project.address}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDateWithOrdinal(project.created_at)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => handleEditClick(e, project)}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <div onClick={(e) => e.stopPropagation()}>
              <DeleteButton
                onDelete={() => handleDeleteClick(project.id)}
                title="Delete Project"
                description={`Are you sure you want to delete ${project.name}? This action cannot be undone and will also delete all associated data.`}
                isLoading={deleteProjectMutation.isPending}
                size="sm"
                className="h-6 w-6 p-0"
                showIcon={true}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-black">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm">
            <span className="text-gray-600">Manager: </span>
            <span className="font-medium text-black">{project.manager}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Created: </span>
            <span className="font-medium text-black">{format(new Date(project.created_at), 'MMM dd')}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = (status: string) => (
    <div className="text-center py-8">
      <div className="flex flex-col items-center justify-center">
        <div 
          className="bg-gray-100 p-4 rounded-full mb-4 cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => setIsNewProjectOpen(true)}
        >
          <Plus className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No {status.toLowerCase()} projects</h3>
        <p className="text-gray-600 mb-4">Projects with "{status}" status will appear here</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Projects</h2>
            <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
              View All
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="h-2 bg-gray-200 rounded mb-3"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Projects</h2>
            <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
              View All
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          <Tabs defaultValue="In Design" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {statusTabs.map((status) => (
                <TabsTrigger key={status} value={status} className="text-xs">
                  {status} ({getProjectCount(status)})
                </TabsTrigger>
              ))}
            </TabsList>
            
            {statusTabs.map((status) => (
              <TabsContent key={status} value={status} className="mt-6">
                <div className="space-y-4">
                  {(() => {
                    const statusProjects = filterProjectsByStatus(status);
                    return statusProjects.length > 0 
                      ? statusProjects.map(renderProjectCard)
                      : renderEmptyState(status);
                  })()}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Card>

      <NewProjectDialog 
        open={isNewProjectOpen} 
        onOpenChange={setIsNewProjectOpen} 
      />

      <EditProjectDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
      />
    </>
  );
}
