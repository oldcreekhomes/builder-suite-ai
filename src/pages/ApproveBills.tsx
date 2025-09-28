import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProject";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AccountingSidebar } from "@/components/sidebar/AccountingSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BillsApprovalTabs } from "@/components/bills/BillsApprovalTabs";

export default function ApproveBills() {
  const { projectId } = useParams();
  const { data: project } = useProject(projectId || "");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AccountingSidebar projectId={projectId} />
        <SidebarInset>
          <DashboardHeader 
            title={`Bills - Approve Bills${project?.address ? ` - ${project.address}` : ''}`} 
            projectId={projectId}
          />
          <div className="container mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Approve Bills</h1>
              <p className="text-muted-foreground">Review and manage bills by approval status.</p>
            </div>

            <BillsApprovalTabs />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}