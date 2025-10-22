import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BillsApprovalTabs } from "@/components/bills/BillsApprovalTabs";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { ManageBillsGuard } from "@/components/guards/ManageBillsGuard";

export default function ApproveBills() {
  const { projectId } = useParams();

  return (
    <ManageBillsGuard>
      <UniversalFilePreviewProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <SidebarInset>
              <DashboardHeader 
                title="Manage Bills" 
                projectId={projectId}
              />
              <div className="container mx-auto p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Manage Bills</h1>
                <p className="text-muted-foreground">Review, approve and locate invoices - all in one place.</p>
              </div>

                <BillsApprovalTabs projectId={projectId} />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </UniversalFilePreviewProvider>
    </ManageBillsGuard>
  );
}