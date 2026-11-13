import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MultiDepositTable } from "@/components/multi-entry/MultiDepositTable";
import { MultiDepositBatchHistory } from "@/components/multi-entry/MultiDepositBatchHistory";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function MultipleDeposits() {
  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader moduleStyle title="Multiple Deposits" subtitle="Enter deposits across many projects and save them as one batch." />
            <main className="flex-1 overflow-auto">
              <div className="flex-1 px-6 pt-3 pb-6 space-y-6">
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
