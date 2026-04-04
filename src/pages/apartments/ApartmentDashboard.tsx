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
                    <Row label="Loan-to-Value (LTV)" value={fmtPct(inputs.ltv)} />
                    <Row label="Loan Amount" value={fmt(computed.loanAmount)} />
                    <Row label="Interest Rate" value={fmtPct(inputs.interest_rate, 2)} />
                    <Row label="Amortization Period" value={`${inputs.amortization_years} years`} />
                    <Row label="Annual Debt Service" value={`(${fmt(computed.annualDebtService)})`} className="text-destructive" />
                    <Row label="DSCR" value={`${computed.dscr.toFixed(2)}x`} bold />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Expense &amp; NOI Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-2">
                    <Row label="Taxes" value={fmt(inputs.taxes)} />
                    <Row label="Insurance" value={fmt(inputs.insurance)} />
                    <Row label="Utilities" value={fmt(inputs.utilities)} />
                    <Row label="Repairs & Maintenance" value={fmt(inputs.repairs_maintenance)} />
                  </div>
                  <div className="space-y-2">
                    <Row label={`Management Fee (${fmtPct(inputs.management_fee_percent)})`} value={fmt(computed.managementFee)} />
                    <Row label="Payroll" value={fmt(inputs.payroll)} />
                    <Row label="General & Administrative" value={fmt(inputs.general_admin)} />
                    <Row label="Marketing" value={fmt(inputs.marketing)} />
                  </div>
                  <div className="space-y-2">
                    <Row label="Reserves (per unit)" value={fmt(computed.reserves)} />
                    <Row label="Total Operating Expenses" value={fmt(computed.totalOpEx)} bold />
                    <Row label="NOI" value={fmt(computed.noi)} bold />
                    <Row label="Expense Ratio" value={fmtPct(computed.expenseRatio)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Property Assumptions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Number of Units" value={String(inputs.number_of_units)} />
                    <Row label="Average Rent per Unit" value={`${fmt(inputs.avg_rent_per_unit)}/mo`} />
                    <Row label="Vacancy Rate" value={fmtPct(inputs.vacancy_rate)} />
                    <Row label="Operating Expense Ratio" value={fmtPct(computed.expenseRatio)} />
                    <Row label="Cap Rate" value={fmtPct(computed.capRate, 2)} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Key Performance Metrics</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <Row label="Cash-on-Cash Return" value={fmtPct(computed.cashOnCash, 2)} />
                    <Row label="Debt Service Coverage Ratio" value={`${computed.dscr.toFixed(2)}x`} />
                    <Row label="Cash Flow After Debt Service" value={fmt(computed.cashFlowAfterDebt)} />
                    <Row label="Price Per Unit" value={fmt(computed.pricePerUnit)} />
                    <Row label="GRM (Gross Rent Multiplier)" value={computed.grm.toFixed(2)} />
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
