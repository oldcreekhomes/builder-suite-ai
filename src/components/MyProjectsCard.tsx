import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Building2 } from "lucide-react";
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

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on hold':
        return 'outline';
      default:
        return 'secondary';
    }
  };

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
          <ScrollArea className="h-[280px]">
            <div className="space-y-1 pr-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm font-medium truncate flex-1 min-w-0">{project.address}</p>
                  <Badge variant={getStatusVariant(project.status)} className="text-xs flex-shrink-0">
                    {project.status || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
