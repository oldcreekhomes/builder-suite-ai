import { SidebarProvider } from "@/components/ui/sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AccountingGuard } from "@/components/guards/AccountingGuard";
import { CloseBooksPeriodManager } from "@/components/accounting/CloseBooksPeriodManager";
import { useCloseBookPermissions } from "@/hooks/useCloseBookPermissions";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CloseBooks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canCloseBooks, isLoading } = useCloseBookPermissions();

  useEffect(() => {
    if (!isLoading && !canCloseBooks) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to close books.",
        variant: "destructive",
      });
      navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
    }
  }, [canCloseBooks, isLoading, navigate, toast, projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!canCloseBooks || !projectId) {
    return null;
  }

  return (
    <AccountingGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <DashboardHeader 
              title="Close the Books"
              projectId={projectId}
            />
            
            <div className="flex-1 p-6">
              <CloseBooksPeriodManager projectId={projectId} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AccountingGuard>
  );
}
