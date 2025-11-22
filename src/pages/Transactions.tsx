import { useParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TransactionsTabs } from "@/components/transactions/TransactionsTabs";
import { TransactionsGuard } from "@/components/guards/TransactionsGuard";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function Transactions() {
  const { projectId } = useParams();

  return (
    <TransactionsGuard>
      <UniversalFilePreviewProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <SidebarInset>
              <DashboardHeader 
                title="Transactions" 
                projectId={projectId}
              />
              <div className="mx-auto p-6 w-full">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">Transactions</h1>
                  <p className="text-muted-foreground">Manage all transaction types in one place.</p>
                </div>

                <TransactionsTabs projectId={projectId} />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </UniversalFilePreviewProvider>
    </TransactionsGuard>
  );
}
