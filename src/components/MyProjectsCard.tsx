import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Project {
  id: string;
  address: string;
  status: string;
}

const statusGroups = [
  { status: "In Design", color: "bg-yellow-100 text-yellow-800" },
  { status: "Permitting", color: "bg-blue-100 text-blue-800" },
  { status: "Under Construction", color: "bg-orange-100 text-orange-800" },
  { status: "Completed", color: "bg-green-100 text-green-800" },
  { status: "Permanently Closed", color: "bg-gray-100 text-gray-600" },
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

  // Group projects by status
  const projectsByStatus = statusGroups
    .map((group) => ({
      ...group,
      projects: projects.filter((p) => p.status === group.status),
    }))
    .filter((group) => group.projects.length > 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            My Projects
          </CardTitle>
          {projects.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {projects.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No projects assigned
          </div>
        ) : (
          <ScrollArea className="h-full flex-1">
            <div className="space-y-3 pr-4">
              {projectsByStatus.map((group) => (
                <div key={group.status}>
                  <div className={`text-xs font-medium px-2 py-1 rounded mb-1 ${group.color}`}>
                    {group.status} ({group.projects.length})
                  </div>
                  <div className="space-y-0.5">
                    {group.projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="flex items-center py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <p className="text-sm truncate">{project.address}</p>
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
