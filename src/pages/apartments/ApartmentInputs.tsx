import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, ApartmentInputs as ApartmentInputsType, fmt, fmtPct } from "@/hooks/useApartmentInputs";
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
                    <EditableRow label="Number of Units" field="number_of_units" value={inputs.number_of_units} onChange={updateInput} format="number" />
                    <EditableRow label="Average Rent per Unit" field="avg_rent_per_unit" value={inputs.avg_rent_per_unit} onChange={updateInput} format="currency" />
                    <EditableRow label="Vacancy Rate" field="vacancy_rate" value={inputs.vacancy_rate} onChange={updateInput} format="percent" />
                    <EditableRow label="Purchase Price" field="purchase_price" value={inputs.purchase_price} onChange={updateInput} format="currency" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Loan Terms</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <EditableRow label="Loan-to-Value" field="ltv" value={inputs.ltv} onChange={updateInput} format="percent" />
                    <EditableRow label="Interest Rate" field="interest_rate" value={inputs.interest_rate} onChange={updateInput} format="percent" decimals={2} />
                    <EditableRow label="Amortization (years)" field="amortization_years" value={inputs.amortization_years} onChange={updateInput} format="number" />
                    <EditableRow label="Loan Term (years)" field="loan_term_years" value={inputs.loan_term_years} onChange={updateInput} format="number" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <EditableRow label="Tax Rate" field="tax_rate" value={inputs.tax_rate} onChange={updateInput} format="percent" decimals={4} />
                    <EditableRow label="Estimated Value" field="estimated_value" value={inputs.estimated_value} onChange={updateInput} format="currency" />
                    <Row label="Taxes" value={fmt(computed.taxes)} />
                    <EditableRow label="Insurance" field="insurance" value={inputs.insurance} onChange={updateInput} format="currency" />
                    <EditableRow label="Utilities" field="utilities" value={inputs.utilities} onChange={updateInput} format="currency" />
                    <EditableRow label="Repairs & Maintenance" field="repairs_maintenance" value={inputs.repairs_maintenance} onChange={updateInput} format="currency" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses (cont.)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <EditableRow label="Management Fee" field="management_fee_percent" value={inputs.management_fee_percent} onChange={updateInput} format="percent" />
                    <EditableRow label="Payroll" field="payroll" value={inputs.payroll} onChange={updateInput} format="currency" />
                    <EditableRow label="General & Administrative" field="general_admin" value={inputs.general_admin} onChange={updateInput} format="currency" />
                    <EditableRow label="Marketing" field="marketing" value={inputs.marketing} onChange={updateInput} format="currency" />
                    <EditableRow label="Reserves per Unit" field="reserves_per_unit" value={inputs.reserves_per_unit} onChange={updateInput} format="currency" />
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

function formatDisplay(value: number, format: string, decimals?: number): string {
  if (format === "currency") return fmt(value);
  if (format === "percent") return fmtPct(value, decimals ?? 1);
  return String(value);
}

function EditableRow({ label, field, value, onChange, format, decimals }: {
  label: string;
  field: keyof ApartmentInputsType;
  value: number;
  onChange: (field: keyof ApartmentInputsType, value: string) => void;
  format: "currency" | "percent" | "number";
  decimals?: number;
}) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  const handleClick = () => {
    setIsFocused(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      {isFocused ? (
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            onChange(field, e.target.value);
          }}
          onBlur={() => setIsFocused(false)}
          className="w-28 text-right text-sm bg-transparent border-none outline-none p-0 m-0"
        />
      ) : (
        <span
          className="cursor-pointer hover:text-muted-foreground/70 transition-colors"
          onClick={handleClick}
        >
          {formatDisplay(value, format, decimals)}
        </span>
      )}
    </div>
  );
}

export default ApartmentInputsPage;
