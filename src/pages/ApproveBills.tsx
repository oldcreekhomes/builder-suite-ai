import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { BillsApprovalTabs } from "@/components/bills/BillsApprovalTabs";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { ManageBillsGuard } from "@/components/guards/ManageBillsGuard";
import { Button } from "@/components/ui/button";
import { useRestoreBill } from "@/hooks/useRestoreBill";
import { useEffect } from "react";

export default function ApproveBills() {
  const { projectId } = useParams();
  const restoreBill = useRestoreBill();

  // Auto-restore the PEG bill for testing
  useEffect(() => {
    const shouldRestore = new URLSearchParams(window.location.search).get('restore-peg-bill');
    if (shouldRestore === 'true') {
      restoreBill.mutate({
        ownerId: '2653aba8-d154-4301-99bf-77d559492e19',
        vendorId: 'c19e3314-4d27-4ca1-a9b9-c7527ecf1249',
        projectId: 'e5439be5-1658-4a0c-a6d1-c1e03d9eae68',
        billDate: '2025-10-31',
        dueDate: '2025-11-30',
        referenceNumber: 'Restored - MEP Services',
        totalAmount: 500,
        costCodeId: '4f84d934-af78-419c-96b7-b54663855b3a',
        memo: 'MEP Services'
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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