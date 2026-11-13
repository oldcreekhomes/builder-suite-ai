import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MultiCheckTable } from "@/components/multi-entry/MultiCheckTable";
import { MultiCheckBatchHistory } from "@/components/multi-entry/MultiCheckBatchHistory";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function MultipleChecks() {
  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader moduleStyle title="Multiple Checks" subtitle="Enter checks across many projects and save them as one batch." />
            <main className="flex-1 overflow-auto">
              <div className="flex-1 px-6 pt-3 pb-6 space-y-6">
                <MultiCheckTable />
                <MultiCheckBatchHistory />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
}
