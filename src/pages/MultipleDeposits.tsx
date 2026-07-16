import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { MultiDepositTable } from "@/components/multi-entry/MultiDepositTable";
import { MultiDepositBatchHistory } from "@/components/multi-entry/MultiDepositBatchHistory";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function MultipleDeposits() {
  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <CompanyDashboardHeader title=" " />
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6 space-y-6">
                <MultiDepositTable />
                <MultiDepositBatchHistory />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
}
