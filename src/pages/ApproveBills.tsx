import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BillsApprovalTabs } from "@/components/bills/BillsApprovalTabs";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function ApproveBills() {
  const { projectId } = useParams();

  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <DashboardHeader 
              title="Approve Bills" 
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
    </UniversalFilePreviewProvider>
  );
}