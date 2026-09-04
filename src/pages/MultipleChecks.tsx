import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { MultiCheckTable } from "@/components/multi-entry/MultiCheckTable";
import { MultiCheckBatchHistory } from "@/components/multi-entry/MultiCheckBatchHistory";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function MultipleChecks() {
  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <CompanyDashboardHeader title=" " />
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6 space-y-6">
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
