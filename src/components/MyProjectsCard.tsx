import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Project {
  id: string;
  address: string;
  status: string;
}

// Helper function to get street address only (before first comma)
const getStreetAddress = (address: string) => {
  if (!address) return '';
  const commaIndex = address.indexOf(',');
  return commaIndex > -1 ? address.substring(0, commaIndex) : address;
};

const statusGroups = [
  { 
    status: "In Design", 
    stripBg: "bg-yellow-100",
    textColor: "text-yellow-800",
    badgeBorder: "border border-yellow-400"
  },
  { 
    status: "Permitting", 
    stripBg: "bg-blue-100",
    textColor: "text-blue-800",
    badgeBorder: "border border-blue-400"
  },
  { 
    status: "Under Construction", 
    stripBg: "bg-orange-100",
    textColor: "text-orange-800",
    badgeBorder: "border border-orange-400"
  },
  { 
    status: "Completed", 
    stripBg: "bg-green-100",
    textColor: "text-green-800",
    badgeBorder: "border border-green-400"
  },
  { 
    status: "Template", 
    stripBg: "bg-purple-100",
    textColor: "text-purple-800",
    badgeBorder: "border border-purple-400"
  },
];

export function MyProjectsCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['my-projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('id, address, status')
        .eq('construction_manager', user.id)
        .order('address');

      if (error) {
        console.error('Error fetching my projects:', error);
        return [];
      }

      return data as Project[];
    },
    enabled: !!user?.id,
  });

  // Filter out permanently closed projects
  const activeProjects = projects.filter((p) => p.status !== "Permanently Closed");

  // Group projects by status
  const projectsByStatus = statusGroups
    .map((group) => ({
      ...group,
      projects: activeProjects.filter((p) => p.status === group.status),
    }))
    .filter((group) => group.projects.length > 0);

  return (
    <Card className="h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-black">My Projects</h3>
          </div>
          {activeProjects.length > 0 && (
            <span className="bg-gray-800 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
              {activeProjects.length}
            </span>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading projects...</div>
        ) : activeProjects.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No projects assigned
          </div>
        ) : (
          <ScrollArea className="h-full flex-1">
            <div className="space-y-3 p-6">
              {projectsByStatus.map((group) => (
                <div key={group.status}>
                  <div className={`flex items-center gap-1.5 mb-1 px-2 py-1 rounded ${group.stripBg}`}>
                    <span className={`text-xs font-medium ${group.textColor}`}>{group.status}</span>
                    <span className={`rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium ${group.stripBg} ${group.badgeBorder} ${group.textColor}`}>
                      {group.projects.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="flex items-center py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm truncate">{getStreetAddress(project.address)}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{project.address}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
