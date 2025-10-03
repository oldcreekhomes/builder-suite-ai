import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BillsReviewTable } from "@/components/bills/BillsReviewTable";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ReviewBills = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1">
          <DashboardHeader />
          <main className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/enter-bills')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Enter Bills
                  </Button>
                </div>
                <h1 className="text-3xl font-bold">Review Bills</h1>
                <p className="text-muted-foreground">
                  Review and approve AI-extracted bills before adding them to your accounting system
                </p>
              </div>
            </div>

            <BillsReviewTable />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ReviewBills;
