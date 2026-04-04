import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, ApartmentInputs as ApartmentInputsType, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { Loader2, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type OptionalExpense = {
  label: string;
  field: keyof ApartmentInputsType;
  format: "currency" | "percent" | "number";
  decimals?: number;
};

const OPTIONAL_EXPENSES: OptionalExpense[] = [
  { label: "Insurance", field: "insurance", format: "currency" },
  { label: "Utilities", field: "utilities", format: "currency" },
  { label: "Repairs & Maintenance", field: "repairs_maintenance", format: "currency" },
  { label: "Landscaping", field: "landscaping", format: "currency" },
  { label: "Snow Removal", field: "snow_removal", format: "currency" },
  { label: "Trash Removal", field: "trash_removal", format: "currency" },
  { label: "Pest Control", field: "pest_control", format: "currency" },
  { label: "Management Fee", field: "management_fee_percent", format: "percent" },
  { label: "General & Administrative", field: "general_admin", format: "currency" },
  { label: "Marketing", field: "marketing", format: "currency" },
  { label: "Reserves per Unit", field: "reserves_per_unit", format: "currency" },
  { label: "Security", field: "security", format: "currency" },
  { label: "Professional Fees", field: "professional_fees", format: "currency" },
  { label: "CapEx Reserve", field: "capex_reserve", format: "currency" },
  { label: "Other / Miscellaneous", field: "other_misc", format: "currency" },
];

function getStorageKey(projectId?: string) {
  return `apartment-visible-expenses-${projectId || "default"}`;
}

function loadVisibleExpenses(projectId?: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return OPTIONAL_EXPENSES.map((e) => e.field);
}

function saveVisibleExpenses(projectId: string | undefined, fields: string[]) {
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(fields));
}

const ApartmentInputsPage = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading, updateInput } = useApartmentInputs(projectId);
  const [visibleFields, setVisibleFields] = useState<string[]>(() => loadVisibleExpenses(projectId));
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    saveVisibleExpenses(projectId, visibleFields);
  }, [visibleFields, projectId]);

  const visibleOptional = useMemo(
    () => OPTIONAL_EXPENSES.filter((e) => visibleFields.includes(e.field)),
    [visibleFields]
  );

  const hiddenOptional = useMemo(
    () => OPTIONAL_EXPENSES.filter((e) => !visibleFields.includes(e.field)),
    [visibleFields]
  );

  const leftCount = Math.ceil(visibleOptional.length / 2);
  const leftItems = visibleOptional.slice(0, leftCount);
  const rightItems = visibleOptional.slice(leftCount);

  const removeExpense = (field: string) => {
    setVisibleFields((prev) => prev.filter((f) => f !== field));
    updateInput(field as keyof ApartmentInputsType, "0");
  };

  const addExpense = (field: string) => {
    setVisibleFields((prev) => [...prev, field]);
    setAddOpen(false);
  };

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
                    <EditableRow label="Tax Rate" field="tax_rate" value={inputs.tax_rate} onChange={updateInput} format="number" />
                    <EditableRow label="Estimated Value" field="estimated_value" value={inputs.estimated_value} onChange={updateInput} format="currency" />
                    <Row label="Taxes" value={fmt(computed.taxes)} />
                    {leftItems.map((item) => (
                      <RemovableEditableRow
                        key={item.field}
                        label={item.label}
                        field={item.field}
                        value={inputs[item.field] as number}
                        onChange={updateInput}
                        format={item.format}
                        decimals={item.decimals}
                        onRemove={() => removeExpense(item.field)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses (cont.)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {rightItems.map((item) => (
                      <RemovableEditableRow
                        key={item.field}
                        label={item.label}
                        field={item.field}
                        value={inputs[item.field] as number}
                        onChange={updateInput}
                        format={item.format}
                        decimals={item.decimals}
                        onRemove={() => removeExpense(item.field)}
                      />
                    ))}
                    {rightItems.length === 0 && (
                      <span className="text-muted-foreground text-xs italic">No items</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {hiddenOptional.length > 0 && (
              <div className="flex justify-center">
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Expense
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="center">
                    <div className="space-y-0.5">
                      {hiddenOptional.map((item) => (
                        <button
                          key={item.field}
                          onClick={() => addExpense(item.field)}
                          className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
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

function RemovableEditableRow({ label, field, value, onChange, format, decimals, onRemove }: {
  label: string;
  field: keyof ApartmentInputsType;
  value: number;
  onChange: (field: keyof ApartmentInputsType, value: string) => void;
  format: "currency" | "percent" | "number";
  decimals?: number;
  onRemove: () => void;
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
    <div className="flex justify-between group">
      <span className="text-muted-foreground flex items-center gap-1">
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
          title="Remove"
        >
          <X className="h-3 w-3" />
        </button>
        {label}
      </span>
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
