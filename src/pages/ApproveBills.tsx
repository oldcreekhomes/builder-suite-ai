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
                subtitle="Review, approve and locate invoices - all in one place."
                projectId={projectId}
              />
              <div className="flex flex-1 overflow-hidden pt-3">

                <BillsApprovalTabs projectId={projectId} />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </UniversalFilePreviewProvider>
    </ManageBillsGuard>
  );
}