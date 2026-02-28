
import { useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useBudgetLockStatus } from "@/hooks/useBudgetLockStatus";
import { Button } from "@/components/ui/button";
import { Lock, LockOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProjectBudget() {
  const { projectId } = useParams();
  const [budgetHeaderActions, setBudgetHeaderActions] = useState<ReactNode>(null);

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

  const { isLocked, canLockBudgets, lockBudget, unlockBudget } = useBudgetLockStatus(projectId || '');

  if (!projectId) {
    return <div>Project not found</div>;
  }

  const lockButton = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={canLockBudgets ? () => (isLocked ? unlockBudget(undefined) : lockBudget(undefined)) : undefined}
            disabled={!canLockBudgets}
          >
            {isLocked ? (
              <Lock className="h-5 w-5 text-red-600" />
            ) : (
              <LockOpen className="h-5 w-5 text-green-600" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!canLockBudgets ? (
            <p>No access. Contact admin.</p>
          ) : isLocked ? (
            <p>Budget is locked. Click to unlock.</p>
          ) : (
            <p>Budget is unlocked. Click to lock.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const combinedHeaderAction = (
    <div className="flex items-center gap-2">
      {lockButton}
      {budgetHeaderActions}
    </div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Budget"
            subtitle="Manage project budget and cost tracking."
            projectId={projectId}
            headerAction={combinedHeaderAction}
          />
          
          <main className="flex-1 px-6 pt-3 pb-6">
            <UniversalFilePreviewProvider>
              <BudgetTable 
                projectId={projectId} 
                projectAddress={project?.address}
                onHeaderActionChange={setBudgetHeaderActions}
              />
            </UniversalFilePreviewProvider>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
