import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar, Pencil, Trash2 } from "lucide-react";
import { CreateTakeoffDialog } from "./CreateTakeoffDialog";
import { toast } from "sonner";

export function TakeoffList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: takeoffs, isLoading, refetch } = useQuery({
    queryKey: ['takeoff-projects', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('takeoff_projects')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('takeoff_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Takeoff deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting takeoff:', error);
      toast.error('Failed to delete takeoff');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Takeoff Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage material takeoffs from construction drawings
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Takeoff
        </Button>
      </div>

      {!takeoffs || takeoffs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No takeoffs yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by creating your first takeoff project
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Takeoff
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {takeoffs.map((takeoff) => (
            <Card key={takeoff.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{takeoff.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/project/${projectId}/estimate/${takeoff.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(takeoff.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                {takeoff.description && (
                  <CardDescription className="line-clamp-2">{takeoff.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(takeoff.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTakeoffDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
