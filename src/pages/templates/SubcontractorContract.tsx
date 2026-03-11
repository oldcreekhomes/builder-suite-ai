import { useState, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SubcontractorContractForm from "@/components/templates/SubcontractorContractForm";

const SubcontractorContract = () => {
  const navigate = useNavigate();
  const [printFn, setPrintFn] = useState<(() => void) | null>(null);

  const handlePrintReady = useCallback((fn: () => void) => {
    setPrintFn(() => fn);
  }, []);

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <CompanyDashboardHeader />
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6 no-print">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Subcontractor Contract</h1>
                <p className="text-muted-foreground text-sm mt-1">Fill in the fields below, then print or save as PDF</p>
              </div>
            </div>
            <Button onClick={() => printFn?.()} className="gap-2" disabled={!printFn}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          <SubcontractorContractForm onPrintReady={handlePrintReady} />
        </div>
      </SidebarInset>
    </>
  );
};

export default SubcontractorContract;
