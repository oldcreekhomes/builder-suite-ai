import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const ApartmentInputs = () => {
  const { projectId } = useParams();
  const [inputs, setInputs] = useState({
    numberOfUnits: "200",
    avgRentPerUnit: "1500",
    vacancyRate: "5",
    purchasePrice: "25000000",
    ltv: "75",
    interestRate: "6.5",
    amortizationYears: "30",
    loanTermYears: "30",
    taxes: "500000",
    insurance: "250000",
    utilities: "200000",
    repairsMaintenance: "180000",
    managementFeePercent: "5",
    payroll: "200000",
    generalAdmin: "100000",
    marketing: "50000",
    reservesPerUnit: "295",
  });

  const handleChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader
            title="Inputs"
            subtitle="Property, revenue, and loan assumptions."
            projectId={projectId}
          />
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6 overflow-auto">
            {/* Property & Revenue */}
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Property &amp; Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Number of Units" value={inputs.numberOfUnits} onChange={(v) => handleChange("numberOfUnits", v)} />
                  <Field label="Average Rent per Unit ($/mo)" value={inputs.avgRentPerUnit} onChange={(v) => handleChange("avgRentPerUnit", v)} prefix="$" />
                  <Field label="Vacancy Rate (%)" value={inputs.vacancyRate} onChange={(v) => handleChange("vacancyRate", v)} suffix="%" />
                  <Field label="Purchase Price ($)" value={inputs.purchasePrice} onChange={(v) => handleChange("purchasePrice", v)} prefix="$" />
                </div>
              </CardContent>
            </Card>

            {/* Loan Terms */}
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Loan Terms</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Loan-to-Value (%)" value={inputs.ltv} onChange={(v) => handleChange("ltv", v)} suffix="%" />
                  <Field label="Interest Rate (%)" value={inputs.interestRate} onChange={(v) => handleChange("interestRate", v)} suffix="%" />
                  <Field label="Amortization (years)" value={inputs.amortizationYears} onChange={(v) => handleChange("amortizationYears", v)} />
                  <Field label="Loan Term (years)" value={inputs.loanTermYears} onChange={(v) => handleChange("loanTermYears", v)} />
                </div>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Real Estate Taxes ($)" value={inputs.taxes} onChange={(v) => handleChange("taxes", v)} prefix="$" />
                  <Field label="Insurance ($)" value={inputs.insurance} onChange={(v) => handleChange("insurance", v)} prefix="$" />
                  <Field label="Utilities ($)" value={inputs.utilities} onChange={(v) => handleChange("utilities", v)} prefix="$" />
                  <Field label="Repairs & Maintenance ($)" value={inputs.repairsMaintenance} onChange={(v) => handleChange("repairsMaintenance", v)} prefix="$" />
                  <Field label="Management Fee (%)" value={inputs.managementFeePercent} onChange={(v) => handleChange("managementFeePercent", v)} suffix="%" />
                  <Field label="Payroll ($)" value={inputs.payroll} onChange={(v) => handleChange("payroll", v)} prefix="$" />
                  <Field label="General & Administrative ($)" value={inputs.generalAdmin} onChange={(v) => handleChange("generalAdmin", v)} prefix="$" />
                  <Field label="Marketing ($)" value={inputs.marketing} onChange={(v) => handleChange("marketing", v)} prefix="$" />
                  <Field label="Reserves per Unit ($)" value={inputs.reservesPerUnit} onChange={(v) => handleChange("reservesPerUnit", v)} prefix="$" />
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

export default ApartmentInputs;
