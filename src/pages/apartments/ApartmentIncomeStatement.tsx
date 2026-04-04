import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { Loader2 } from "lucide-react";

const ApartmentIncomeStatement = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading } = useApartmentInputs(projectId);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Income Statement" subtitle="Pro forma income statement projections." projectId={projectId} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const units = inputs.number_of_units || 1;
  const egi = computed.egi || 1;

  const perUnit = (v: number) => fmt(v / units);
  const pctEgi = (v: number) => fmtPct((v / egi) * 100);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Income Statement" subtitle="Pro forma income statement projections." projectId={projectId} />
          <div className="flex-1 px-6 pt-3 pb-6 overflow-auto">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Pro Forma Income Statement</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">Line Item</th>
                        <th className="text-right py-2 px-4 font-medium">Annual</th>
                        <th className="text-right py-2 px-4 font-medium">Per Unit</th>
                        <th className="text-right py-2 pl-4 font-medium">% of EGI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <SectionHeader title="Revenue" />
                      <StatementRow label="Gross Potential Rent" annual={fmt(computed.grossPotentialRent)} perUnit={perUnit(computed.grossPotentialRent)} pct={pctEgi(computed.grossPotentialRent)} />
                      <StatementRow label={`Less: Vacancy (${fmtPct(inputs.vacancy_rate)})`} annual={`(${fmt(computed.vacancyLoss)})`} perUnit={`(${perUnit(computed.vacancyLoss)})`} pct={`-${pctEgi(computed.vacancyLoss)}`} negative />
                      <TotalRow label="Effective Gross Income" annual={fmt(computed.egi)} perUnit={perUnit(computed.egi)} pct="100.0%" />

                      <SectionHeader title="Operating Expenses" />
                      <StatementRow label="Real Estate Taxes" annual={fmt(computed.taxes)} perUnit={perUnit(computed.taxes)} pct={pctEgi(computed.taxes)} />
                      <StatementRow label="Insurance" annual={fmt(inputs.insurance)} perUnit={perUnit(inputs.insurance)} pct={pctEgi(inputs.insurance)} />
                      <StatementRow label="Utilities" annual={fmt(inputs.utilities)} perUnit={perUnit(inputs.utilities)} pct={pctEgi(inputs.utilities)} />
                      <StatementRow label="Repairs & Maintenance" annual={fmt(inputs.repairs_maintenance)} perUnit={perUnit(inputs.repairs_maintenance)} pct={pctEgi(inputs.repairs_maintenance)} />
                      <StatementRow label="Landscaping / Snow Removal" annual={fmt(inputs.landscaping)} perUnit={perUnit(inputs.landscaping)} pct={pctEgi(inputs.landscaping)} />
                      <StatementRow label="Trash Removal" annual={fmt(inputs.trash_removal)} perUnit={perUnit(inputs.trash_removal)} pct={pctEgi(inputs.trash_removal)} />
                      <StatementRow label="Pest Control" annual={fmt(inputs.pest_control)} perUnit={perUnit(inputs.pest_control)} pct={pctEgi(inputs.pest_control)} />
                      <StatementRow label={`Management (${fmtPct(inputs.management_fee_percent)})`} annual={fmt(computed.managementFee)} perUnit={perUnit(computed.managementFee)} pct={pctEgi(computed.managementFee)} />
                      <StatementRow label="Payroll" annual={fmt(inputs.payroll)} perUnit={perUnit(inputs.payroll)} pct={pctEgi(inputs.payroll)} />
                      <StatementRow label="General & Administrative" annual={fmt(inputs.general_admin)} perUnit={perUnit(inputs.general_admin)} pct={pctEgi(inputs.general_admin)} />
                      <StatementRow label="Marketing" annual={fmt(inputs.marketing)} perUnit={perUnit(inputs.marketing)} pct={pctEgi(inputs.marketing)} />
                      <StatementRow label="Security / Access Control" annual={fmt(inputs.security)} perUnit={perUnit(inputs.security)} pct={pctEgi(inputs.security)} />
                      <StatementRow label="Professional Fees" annual={fmt(inputs.professional_fees)} perUnit={perUnit(inputs.professional_fees)} pct={pctEgi(inputs.professional_fees)} />
                      <StatementRow label="CapEx Reserve" annual={fmt(inputs.capex_reserve)} perUnit={perUnit(inputs.capex_reserve)} pct={pctEgi(inputs.capex_reserve)} />
                      <StatementRow label="Other / Miscellaneous" annual={fmt(inputs.other_misc)} perUnit={perUnit(inputs.other_misc)} pct={pctEgi(inputs.other_misc)} />
                      <StatementRow label="Reserves" annual={fmt(computed.reserves)} perUnit={perUnit(computed.reserves)} pct={pctEgi(computed.reserves)} />
                      <TotalRow label="Total Operating Expenses" annual={fmt(computed.totalOpEx)} perUnit={perUnit(computed.totalOpEx)} pct={pctEgi(computed.totalOpEx)} />

                      <TotalRow label="Net Operating Income (NOI)" annual={fmt(computed.noi)} perUnit={perUnit(computed.noi)} pct={pctEgi(computed.noi)} highlight />

                      <SectionHeader title="Debt Service" />
                      <StatementRow label="Annual Debt Service" annual={`(${fmt(computed.annualDebtService)})`} perUnit={`(${perUnit(computed.annualDebtService)})`} pct={pctEgi(computed.annualDebtService)} negative />

                      <TotalRow label="Cash Flow After Debt Service" annual={fmt(computed.cashFlowAfterDebt)} perUnit={perUnit(computed.cashFlowAfterDebt)} pct={pctEgi(computed.cashFlowAfterDebt)} highlight />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={4} className="pt-4 pb-1 font-semibold text-foreground">{title}</td>
    </tr>
  );
}

function StatementRow({ label, annual, perUnit, pct, negative }: {
  label: string; annual: string; perUnit: string; pct: string; negative?: boolean;
}) {
  const cls = negative ? "text-destructive" : "";
  return (
    <tr>
      <td className="py-1.5 pr-4 pl-4 text-muted-foreground">{label}</td>
      <td className={`py-1.5 px-4 text-right ${cls}`}>{annual}</td>
      <td className={`py-1.5 px-4 text-right ${cls}`}>{perUnit}</td>
      <td className={`py-1.5 pl-4 text-right ${cls}`}>{pct}</td>
    </tr>
  );
}

function TotalRow({ label, annual, perUnit, pct, highlight }: {
  label: string; annual: string; perUnit: string; pct: string; highlight?: boolean;
}) {
  const bgCls = highlight ? "bg-muted/50" : "";
  return (
    <tr className={`font-semibold ${bgCls}`}>
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 px-4 text-right">{annual}</td>
      <td className="py-2 px-4 text-right">{perUnit}</td>
      <td className="py-2 pl-4 text-right">{pct}</td>
    </tr>
  );
}

export default ApartmentIncomeStatement;
