import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { ProjectManagerDashboard } from "@/components/dashboard/ProjectManagerDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { Skeleton } from "@/components/ui/skeleton";

export default function Index() {
  const { showTabs, dashboardType, isLoading } = useDashboardAccess();

  const renderDashboard = () => {
    if (isLoading) {
      return (
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    // Owner sees tabs with both dashboards
    if (showTabs) {
      return <DashboardTabs />;
    }

    // Employees see their assigned dashboard
    if (dashboardType === 'accountant') {
      return <AccountantDashboard />;
    }

    return <ProjectManagerDashboard />;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <CompanyDashboardHeader />
          {renderDashboard()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}