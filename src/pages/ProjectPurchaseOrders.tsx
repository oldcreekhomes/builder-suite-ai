import { useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProject";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PurchaseOrdersTable } from "@/components/purchaseOrders/PurchaseOrdersTable";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function ProjectPurchaseOrders() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId!);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Loading project...</h2>
        </div>
      </div>
    );
  }

  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader
              title="Purchase Orders"
              subtitle="Manage purchase orders for this project."
              projectId={projectId}
            />
            <main className="flex-1 px-6 pt-3 pb-6">
              <PurchaseOrdersTable projectId={projectId!} projectAddress={project?.address} />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
}