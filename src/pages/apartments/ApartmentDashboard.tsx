import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { useProject } from "@/hooks/useProject";
import { Loader2, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ApartmentDashboardPdfDocument } from "@/components/apartments/pdf/ApartmentDashboardPdfDocument";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ApartmentDashboard = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading } = useApartmentInputs(projectId);
  const { data: project } = useProject(projectId || "");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(
        <ApartmentDashboardPdfDocument
          projectAddress={project?.address}
          inputs={inputs}
          computed={computed}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      link.href = url;
      link.download = `Apartment_Dashboard-${stamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF exported", description: "Your dashboard PDF has been downloaded" });
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportButton = (
    <Button onClick={handleExportPdf} disabled={isExporting || isLoading} size="sm" variant="outline">
      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      Export PDF
    </Button>
  );

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Dashboard" subtitle="Apartment investment overview and key metrics." projectId={projectId} headerAction={exportButton} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Dashboard" subtitle="Apartment investment overview and key metrics." projectId={projectId} headerAction={exportButton} />
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Income Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Number of Units" value={String(computed.units)} />
                    <Row label="Gross Potential Rent (Annual)" value={fmt(computed.grossPotentialRent)} />
                    <Row label={`Vacancy Loss (${fmtPct(inputs.vacancy_rate)})`} value={`(${fmt(computed.vacancyLoss)})`} className="text-destructive" />
                    <Row label="Effective Gross Income" value={fmt(computed.egi)} bold />
                    <Row label="Total Operating Expenses" value={`(${fmt(computed.totalOpEx)})`} className="text-destructive" />
                    <Row label="Net Operating Income (NOI)" value={fmt(computed.noi)} bold />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Loan Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Purchase Price" value={fmt(inputs.purchase_price)} />
                    <Row label="Loan-to-Value (LTV)" value={computed.ltvComputed > 0 ? fmtPct(computed.ltvComputed, 2) : fmtPct(inputs.ltv)} />
                    <Row label="Loan Amount" value={fmt(computed.loanAmount)} />
                    <Row label="Interest Rate" value={fmtPct(inputs.interest_rate, 2)} />
                    <Row label="Amortization Period" value={`${inputs.amortization_years} years`} />
                    <Row label="Annual Debt Service" value={`(${fmt(computed.annualDebtService)})`} className="text-destructive" />
                    <Row label="DSCR" value={`${computed.dscr.toFixed(2)}x`} bold />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Property Assumptions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Number of Units" value={String(computed.units)} />
                    <Row label="Market Rate Units" value={`${inputs.market_units} × ${fmt(inputs.market_rent)}`} />
                    <Row label="Affordable Rate Units" value={`${inputs.affordable_units} × ${fmt(inputs.affordable_rent)}`} />
                    <Row label="Vacancy Rate" value={fmtPct(inputs.vacancy_rate)} />
                    <Row label="Operating Expense Ratio" value={fmtPct(computed.expenseRatio)} />
                    <Row label="Target Cap Rate" value={inputs.target_cap_rate > 0 ? fmtPct(inputs.target_cap_rate, 2) : "—"} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Asset Valuation</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Net Operating Income (NOI)" value={fmt(computed.noi)} bold />
                    <Row label="Cap Rate" value={inputs.target_cap_rate > 0 ? fmtPct(inputs.target_cap_rate, 2) : "—"} />
                    <div className="border-t border-border" />
                    <Row label="Asset Value (NOI ÷ Cap Rate)" value={computed.assetValue > 0 ? fmt(computed.assetValue) : "—"} bold />
                    <Row label="Loan Amount" value={`(${fmt(computed.loanAmount)})`} className="text-destructive" />
                    <div className="border-t border-border" />
                    <Row label="Equity Created" value={computed.assetValue > 0 ? fmt(computed.equityCreated) : "—"} bold />
                    {inputs.target_cap_rate === 0 && (
                      <p className="text-xs text-muted-foreground italic">Set a Target Cap Rate in the Key Metrics tab to calculate asset value.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${className || ""}`}>{value}</span>
    </div>
  );
}

export default ApartmentDashboard;
