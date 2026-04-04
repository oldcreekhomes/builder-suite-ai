import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { Loader2 } from "lucide-react";

const ApartmentDashboard = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading } = useApartmentInputs(projectId);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Dashboard" subtitle="Apartment investment overview and key metrics." projectId={projectId} />
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
          <DashboardHeader title="Dashboard" subtitle="Apartment investment overview and key metrics." projectId={projectId} />
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Income Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Number of Units" value={String(inputs.number_of_units)} />
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
                    <Row label="Number of Units" value={String(inputs.number_of_units)} />
                    <Row label="Average Rent per Unit" value={`${fmt(inputs.avg_rent_per_unit)}/mo`} />
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
