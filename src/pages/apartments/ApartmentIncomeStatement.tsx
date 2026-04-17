import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { useApartmentExpenseVisibility } from "@/hooks/useApartmentExpenseVisibility";
import { useProject } from "@/hooks/useProject";
import { Loader2, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ApartmentIncomeStatementPdfDocument } from "@/components/apartments/pdf/ApartmentIncomeStatementPdfDocument";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ApartmentIncomeStatement = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading } = useApartmentInputs(projectId);
  const { isVisible } = useApartmentExpenseVisibility(projectId);
  const { data: project } = useProject(projectId || "");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(
        <ApartmentIncomeStatementPdfDocument
          projectAddress={project?.address}
          inputs={inputs}
          computed={computed}
          isVisible={isVisible}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      link.href = url;
      link.download = `Apartment_Income_Statement-${stamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF exported", description: "Your income statement PDF has been downloaded" });
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
            <DashboardHeader title="Income Statement" subtitle="Pro forma income statement projections." projectId={projectId} headerAction={exportButton} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const egi = computed.egi || 1;

  const monthly = (v: number) => fmt(v / 12);
  const pctEgi = (v: number) => fmtPct((v / egi) * 100);

  // Data-driven expense rows. Each row's `field` matches the key used by the
  // Inputs page visibility toggle so removed rows disappear here automatically.
  const expenseRows: Array<{ field: string; label: string; value: number }> = [
    { field: "taxes", label: "Real Estate Taxes", value: computed.taxes },
    { field: "insurance", label: "Insurance", value: inputs.insurance },
    { field: "utilities", label: "Utilities", value: inputs.utilities },
    { field: "repairs_maintenance", label: "Repairs & Maintenance", value: inputs.repairs_maintenance },
    { field: "landscaping", label: "Landscaping", value: inputs.landscaping },
    { field: "snow_removal", label: "Snow Removal", value: inputs.snow_removal },
    { field: "trash_removal", label: "Trash Removal", value: inputs.trash_removal },
    { field: "pest_control", label: "Pest Control", value: inputs.pest_control },
    { field: "management_fee_percent", label: `Management (${fmtPct(inputs.management_fee_percent)})`, value: computed.managementFee },
    { field: "general_admin", label: "General & Administrative", value: inputs.general_admin },
    { field: "marketing", label: "Marketing", value: inputs.marketing },
    { field: "security", label: "Security", value: inputs.security },
    { field: "professional_fees", label: "Professional Fees", value: inputs.professional_fees },
    { field: "capex_reserve", label: "CapEx Reserve", value: inputs.capex_reserve },
    { field: "other_misc", label: "Other / Miscellaneous", value: inputs.other_misc },
    { field: "reserves_per_unit", label: "Reserves", value: computed.reserves },
  ].filter((r) => isVisible(r.field));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Income Statement" subtitle="Pro forma income statement projections." projectId={projectId} headerAction={exportButton} />
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
                        <th className="text-right py-2 px-4 font-medium">Monthly</th>
                        <th className="text-right py-2 pl-4 font-medium">% of EGI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <SectionHeader title="Revenue" />
                      <StatementRow label="Gross Potential Rent" annual={fmt(computed.grossPotentialRent)} monthly={monthly(computed.grossPotentialRent)} pct={pctEgi(computed.grossPotentialRent)} />
                      <StatementRow label={`Less: Vacancy (${fmtPct(inputs.vacancy_rate)})`} annual={`(${fmt(computed.vacancyLoss)})`} monthly={`(${monthly(computed.vacancyLoss)})`} pct={`-${pctEgi(computed.vacancyLoss)}`} negative />
                      <TotalRow label="Effective Gross Income" annual={fmt(computed.egi)} monthly={monthly(computed.egi)} pct="100.0%" />

                      <SectionHeader title="Operating Expenses" />
                      {expenseRows.map((r) => (
                        <StatementRow
                          key={r.field}
                          label={r.label}
                          annual={fmt(r.value)}
                          monthly={monthly(r.value)}
                          pct={pctEgi(r.value)}
                        />
                      ))}
                      <TotalRow label="Total Operating Expenses" annual={fmt(computed.totalOpEx)} monthly={monthly(computed.totalOpEx)} pct={pctEgi(computed.totalOpEx)} />

                      <TotalRow label="Net Operating Income (NOI)" annual={fmt(computed.noi)} monthly={monthly(computed.noi)} pct={pctEgi(computed.noi)} highlight />

                      <SectionHeader title="Debt Service" />
                      <StatementRow label="Annual Debt Service" annual={`(${fmt(computed.annualDebtService)})`} monthly={`(${monthly(computed.annualDebtService)})`} pct={pctEgi(computed.annualDebtService)} negative />

                      <TotalRow label="Cash Flow After Debt Service" annual={fmt(computed.cashFlowAfterDebt)} monthly={monthly(computed.cashFlowAfterDebt)} pct={pctEgi(computed.cashFlowAfterDebt)} highlight />
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

function StatementRow({ label, annual, monthly, pct, negative }: {
  label: string; annual: string; monthly: string; pct: string; negative?: boolean;
}) {
  const cls = negative ? "text-destructive" : "";
  return (
    <tr>
      <td className="py-1.5 pr-4 pl-4 text-muted-foreground">{label}</td>
      <td className={`py-1.5 px-4 text-right ${cls}`}>{annual}</td>
      <td className={`py-1.5 px-4 text-right ${cls}`}>{monthly}</td>
      <td className={`py-1.5 pl-4 text-right ${cls}`}>{pct}</td>
    </tr>
  );
}

function TotalRow({ label, annual, monthly, pct, highlight }: {
  label: string; annual: string; monthly: string; pct: string; highlight?: boolean;
}) {
  const bgCls = highlight ? "bg-muted/50" : "";
  return (
    <tr className={`font-semibold ${bgCls}`}>
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 px-4 text-right">{annual}</td>
      <td className="py-2 px-4 text-right">{monthly}</td>
      <td className="py-2 pl-4 text-right">{pct}</td>
    </tr>
  );
}

export default ApartmentIncomeStatement;
