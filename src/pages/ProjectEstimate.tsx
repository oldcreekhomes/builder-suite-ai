import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function ProjectEstimate() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch existing takeoffs for this project
  const { data: takeoffs, isLoading } = useQuery({
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

  // Auto-redirect logic
  useEffect(() => {
    const handleRedirect = async () => {
      if (!projectId || !user || isLoading) return;

      // If takeoffs exist, redirect to the most recent one
      if (takeoffs && takeoffs.length > 0) {
        const mostRecentTakeoff = takeoffs[0];
        navigate(`/project/${projectId}/estimate/${mostRecentTakeoff.id}`, { replace: true });
        return;
      }

      // If no takeoffs exist, create a default one and redirect
      if (takeoffs && takeoffs.length === 0) {
        try {
          const { data: newTakeoff, error } = await supabase
            .from('takeoff_projects')
            .insert({
              project_id: projectId,
              owner_id: user.id,
              name: 'Sheet Elevations',
              description: null,
            })
            .select()
            .single();

          if (error) throw error;

          if (newTakeoff) {
            navigate(`/project/${projectId}/estimate/${newTakeoff.id}`, { replace: true });
          }
        } catch (error) {
          console.error('Error creating default takeoff:', error);
          toast.error('Failed to create takeoff project');
        }
      }
    };

    handleRedirect();
  }, [takeoffs, isLoading, projectId, user, navigate]);

  // Show loading state while redirecting
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Estimate & Takeoff"
          />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-lg text-muted-foreground">Loading...</div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
