import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const ApartmentIncomeStatement = () => {
  const { projectId } = useParams();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader
            title="Income Statement"
            subtitle="Pro forma income statement projections."
            projectId={projectId}
          />
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
                      {/* Revenue */}
                      <SectionHeader title="Revenue" />
                      <StatementRow label="Gross Potential Rent" annual="$3,600,000" perUnit="$18,000" pct="105.3%" />
                      <StatementRow label="Less: Vacancy (5%)" annual="($180,000)" perUnit="($900)" pct="-5.3%" negative />
                      <TotalRow label="Effective Gross Income" annual="$3,420,000" perUnit="$17,100" pct="100.0%" />

                      {/* Operating Expenses */}
                      <SectionHeader title="Operating Expenses" />
                      <StatementRow label="Real Estate Taxes" annual="$500,000" perUnit="$2,500" pct="14.6%" />
                      <StatementRow label="Insurance" annual="$250,000" perUnit="$1,250" pct="7.3%" />
                      <StatementRow label="Utilities" annual="$200,000" perUnit="$1,000" pct="5.8%" />
                      <StatementRow label="Repairs & Maintenance" annual="$180,000" perUnit="$900" pct="5.3%" />
                      <StatementRow label="Management (5%)" annual="$171,000" perUnit="$855" pct="5.0%" />
                      <StatementRow label="Payroll" annual="$200,000" perUnit="$1,000" pct="5.8%" />
                      <StatementRow label="General & Administrative" annual="$100,000" perUnit="$500" pct="2.9%" />
                      <StatementRow label="Marketing" annual="$50,000" perUnit="$250" pct="1.5%" />
                      <StatementRow label="Reserves" annual="$59,000" perUnit="$295" pct="1.7%" />
                      <TotalRow label="Total Operating Expenses" annual="$1,710,000" perUnit="$8,550" pct="50.0%" />

                      {/* NOI */}
                      <TotalRow label="Net Operating Income (NOI)" annual="$1,710,000" perUnit="$8,550" pct="50.0%" highlight />

                      {/* Debt Service */}
                      <SectionHeader title="Debt Service" />
                      <StatementRow label="Annual Debt Service" annual="($1,421,016)" perUnit="($7,105)" pct="41.5%" negative />

                      {/* CFADS */}
                      <TotalRow label="Cash Flow After Debt Service" annual="$288,984" perUnit="$1,445" pct="8.5%" highlight />
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
