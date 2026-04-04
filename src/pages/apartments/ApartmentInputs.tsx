import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, ApartmentInputs as ApartmentInputsType, fmt } from "@/hooks/useApartmentInputs";
import { Loader2 } from "lucide-react";

const ApartmentInputsPage = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading, updateInput } = useApartmentInputs(projectId);

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Property &amp; Revenue</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <EditableRow label="Number of Units" field="number_of_units" value={inputs.number_of_units} onChange={updateInput} />
                    <EditableRow label="Average Rent per Unit ($/mo)" field="avg_rent_per_unit" value={inputs.avg_rent_per_unit} onChange={updateInput} prefix="$" />
                    <EditableRow label="Vacancy Rate (%)" field="vacancy_rate" value={inputs.vacancy_rate} onChange={updateInput} suffix="%" />
                    <EditableRow label="Purchase Price ($)" field="purchase_price" value={inputs.purchase_price} onChange={updateInput} prefix="$" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Loan Terms</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <EditableRow label="Loan-to-Value (%)" field="ltv" value={inputs.ltv} onChange={updateInput} suffix="%" />
                    <EditableRow label="Interest Rate (%)" field="interest_rate" value={inputs.interest_rate} onChange={updateInput} suffix="%" />
                    <EditableRow label="Amortization (years)" field="amortization_years" value={inputs.amortization_years} onChange={updateInput} />
                    <EditableRow label="Loan Term (years)" field="loan_term_years" value={inputs.loan_term_years} onChange={updateInput} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="space-y-2">
                    <EditableRow label="Tax Rate (%)" field="tax_rate" value={inputs.tax_rate} onChange={updateInput} suffix="%" />
                    <EditableRow label="Estimated Value ($)" field="estimated_value" value={inputs.estimated_value} onChange={updateInput} prefix="$" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Taxes ($)</span>
                      <span className="text-sm font-medium">{fmt(computed.taxes)}</span>
                    </div>
                    <EditableRow label="Insurance ($)" field="insurance" value={inputs.insurance} onChange={updateInput} prefix="$" />
                    <EditableRow label="Utilities ($)" field="utilities" value={inputs.utilities} onChange={updateInput} prefix="$" />
                    <EditableRow label="Repairs & Maintenance ($)" field="repairs_maintenance" value={inputs.repairs_maintenance} onChange={updateInput} prefix="$" />
                  </div>
                  <div className="space-y-2">
                    <EditableRow label="Management Fee (%)" field="management_fee_percent" value={inputs.management_fee_percent} onChange={updateInput} suffix="%" />
                    <EditableRow label="Payroll ($)" field="payroll" value={inputs.payroll} onChange={updateInput} prefix="$" />
                    <EditableRow label="General & Administrative ($)" field="general_admin" value={inputs.general_admin} onChange={updateInput} prefix="$" />
                    <EditableRow label="Marketing ($)" field="marketing" value={inputs.marketing} onChange={updateInput} prefix="$" />
                  </div>
                  <div className="space-y-2">
                    <EditableRow label="Reserves per Unit ($)" field="reserves_per_unit" value={inputs.reserves_per_unit} onChange={updateInput} prefix="$" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

function EditableRow({ label, field, value, onChange, prefix, suffix }: {
  label: string;
  field: keyof ApartmentInputsType;
  value: number;
  onChange: (field: keyof ApartmentInputsType, value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
        <Input
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(field, e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-28 h-7 text-right border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-input text-sm px-2"
        />
        {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

export default ApartmentInputsPage;
