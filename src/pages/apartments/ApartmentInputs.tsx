import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, ApartmentInputs as ApartmentInputsType } from "@/hooks/useApartmentInputs";
import { Loader2 } from "lucide-react";

const ApartmentInputsPage = () => {
  const { projectId } = useParams();
  const { inputs, isLoading, updateInput } = useApartmentInputs(projectId);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Inputs" subtitle="Property, revenue, and loan assumptions." projectId={projectId} />
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
          <DashboardHeader title="Inputs" subtitle="Property, revenue, and loan assumptions." projectId={projectId} />
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6 overflow-auto">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Property &amp; Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Number of Units" value={String(inputs.number_of_units)} onChange={(v) => updateInput("number_of_units", v)} />
                  <Field label="Average Rent per Unit ($/mo)" value={String(inputs.avg_rent_per_unit)} onChange={(v) => updateInput("avg_rent_per_unit", v)} prefix="$" />
                  <Field label="Vacancy Rate (%)" value={String(inputs.vacancy_rate)} onChange={(v) => updateInput("vacancy_rate", v)} suffix="%" />
                  <Field label="Purchase Price ($)" value={String(inputs.purchase_price)} onChange={(v) => updateInput("purchase_price", v)} prefix="$" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Loan Terms</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Loan-to-Value (%)" value={String(inputs.ltv)} onChange={(v) => updateInput("ltv", v)} suffix="%" />
                  <Field label="Interest Rate (%)" value={String(inputs.interest_rate)} onChange={(v) => updateInput("interest_rate", v)} suffix="%" />
                  <Field label="Amortization (years)" value={String(inputs.amortization_years)} onChange={(v) => updateInput("amortization_years", v)} />
                  <Field label="Loan Term (years)" value={String(inputs.loan_term_years)} onChange={(v) => updateInput("loan_term_years", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Real Estate Taxes ($)" value={String(inputs.taxes)} onChange={(v) => updateInput("taxes", v)} prefix="$" />
                  <Field label="Insurance ($)" value={String(inputs.insurance)} onChange={(v) => updateInput("insurance", v)} prefix="$" />
                  <Field label="Utilities ($)" value={String(inputs.utilities)} onChange={(v) => updateInput("utilities", v)} prefix="$" />
                  <Field label="Repairs & Maintenance ($)" value={String(inputs.repairs_maintenance)} onChange={(v) => updateInput("repairs_maintenance", v)} prefix="$" />
                  <Field label="Management Fee (%)" value={String(inputs.management_fee_percent)} onChange={(v) => updateInput("management_fee_percent", v)} suffix="%" />
                  <Field label="Payroll ($)" value={String(inputs.payroll)} onChange={(v) => updateInput("payroll", v)} prefix="$" />
                  <Field label="General & Administrative ($)" value={String(inputs.general_admin)} onChange={(v) => updateInput("general_admin", v)} prefix="$" />
                  <Field label="Marketing ($)" value={String(inputs.marketing)} onChange={(v) => updateInput("marketing", v)} prefix="$" />
                  <Field label="Reserves per Unit ($)" value={String(inputs.reserves_per_unit)} onChange={(v) => updateInput("reserves_per_unit", v)} prefix="$" />
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

function Field({ label, value, onChange, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${prefix ? "pl-7" : ""} ${suffix ? "pr-7" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

export default ApartmentInputsPage;
