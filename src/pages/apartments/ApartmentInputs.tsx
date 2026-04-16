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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { notifyApartmentExpensesChanged } from "@/hooks/useApartmentExpenseVisibility";

type OptionalExpense = {
  label: string;
  field: keyof ApartmentInputsType;
  format: "currency" | "percent" | "number";
  decimals?: number;
  special?: "taxes";
};

const OPTIONAL_EXPENSES: OptionalExpense[] = [
  { label: "CapEx Reserve", field: "capex_reserve", format: "currency" },
  { label: "General & Administrative", field: "general_admin", format: "currency" },
  { label: "Insurance", field: "insurance", format: "currency" },
  { label: "Landscaping", field: "landscaping", format: "currency" },
  { label: "Management Fee", field: "management_fee_percent", format: "percent" },
  { label: "Marketing", field: "marketing", format: "currency" },
  { label: "Other / Miscellaneous", field: "other_misc", format: "currency" },
  { label: "Pest Control", field: "pest_control", format: "currency" },
  { label: "Professional Fees", field: "professional_fees", format: "currency" },
  { label: "Repairs & Maintenance", field: "repairs_maintenance", format: "currency" },
  { label: "Reserves per Unit", field: "reserves_per_unit", format: "currency" },
  { label: "Security", field: "security", format: "currency" },
  { label: "Snow Removal", field: "snow_removal", format: "currency" },
  { label: "Taxes", field: "taxes", format: "currency", special: "taxes" },
  { label: "Trash Removal", field: "trash_removal", format: "currency" },
  { label: "Utilities", field: "utilities", format: "currency" },
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
  notifyApartmentExpensesChanged();
}

function rowCount(item: OptionalExpense): number {
  return item.special === "taxes" ? 3 : 1;
}

const ApartmentInputsPage = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading, updateInput } = useApartmentInputs(projectId);
  const [visibleFields, setVisibleFields] = useState<string[]>(() => loadVisibleExpenses(projectId));
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ field: string; label: string } | null>(null);

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

  const { leftItems, rightItems } = useMemo(() => {
    const totalRows = visibleOptional.reduce((acc, item) => acc + rowCount(item), 0);
    const targetLeft = Math.ceil(totalRows / 2);
    let leftCount = 0;
    let splitIndex = 0;
    for (let i = 0; i < visibleOptional.length; i++) {
      const next = leftCount + rowCount(visibleOptional[i]);
      if (next > targetLeft) break;
      leftCount = next;
      splitIndex = i + 1;
    }
    return {
      leftItems: visibleOptional.slice(0, splitIndex),
      rightItems: visibleOptional.slice(splitIndex),
    };
  }, [visibleOptional]);

  const confirmRemove = () => {
    if (!deleteTarget) return;
    const { field } = deleteTarget;
    setVisibleFields((prev) => prev.filter((f) => f !== field));
    if (field === "taxes") {
      updateInput("tax_rate", "0");
      updateInput("estimated_value", "0");
    } else {
      updateInput(field as keyof ApartmentInputsType, "0");
    }
    setDeleteTarget(null);
  };

  const removeExpense = (field: string, label: string) => {
    setDeleteTarget({ field, label });
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

  const numUnits = inputs.number_of_units || 0;

  const renderExpenseItem = (item: OptionalExpense) => {
    if (item.special === "taxes") {
      return (
        <div key={item.field} className="space-y-2">
          <RemovableRow
            label="Taxes"
            monthly={fmt(computed.taxes / 12)}
            annual={fmt(computed.taxes)}
            onRemove={() => removeExpense(item.field, item.label)}
          />
          <div className="pl-4 space-y-2">
            <EditableRow label="Tax Rate" field="tax_rate" value={inputs.tax_rate} onChange={updateInput} format="number" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estimated Value</span>
              <span className="w-28 text-right">{fmt(inputs.estimated_value)}</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <RemovableEditableRow
        key={item.field}
        label={item.label}
        field={item.field}
        value={inputs[item.field] as number}
        onChange={updateInput}
        format={item.format}
        decimals={item.decimals}
        numUnits={numUnits}
        isReservesPerUnit={item.field === "reserves_per_unit"}
        onRemove={() => removeExpense(item.field, item.label)}
      />
    );
  };

  const ExpensesHeader = () => (
    <div className="flex justify-between text-xs font-medium text-muted-foreground pb-1 border-b mb-2">
      <span>&nbsp;</span>
      <div className="flex gap-4">
        <span className="w-28 text-right">Monthly</span>
        <span className="w-28 text-right">Annual</span>
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader title="Inputs" subtitle="Property, revenue, and loan assumptions." projectId={projectId} />
          <div className="flex-1 px-6 pt-3 pb-6 overflow-auto">
            <Tabs defaultValue="inputs" className="space-y-6">
              <TabsList>
                <TabsTrigger value="inputs">Inputs</TabsTrigger>
                <TabsTrigger value="key-metrics">Key Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="inputs" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Property &amp; Revenue</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <EditableRow label="Number of Units" field="number_of_units" value={inputs.number_of_units} onChange={updateInput} format="number" />
                        <EditableRow label="Average Rent per Unit" field="avg_rent_per_unit" value={inputs.avg_rent_per_unit} onChange={updateInput} format="currency" />
                        <EditableRow label="Vacancy Rate" field="vacancy_rate" value={inputs.vacancy_rate} onChange={updateInput} format="percent" />
                        <EditableRow label="Total Costs" field="purchase_price" value={inputs.purchase_price} onChange={updateInput} format="currency" />
                        <EditableRow label="Estimated Value" field="estimated_value" value={inputs.estimated_value} onChange={updateInput} format="currency" />
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
                        <EditableRow label="Loan Amount" field="loan_amount" value={inputs.loan_amount} onChange={updateInput} format="currency" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <ExpensesHeader />
                        {leftItems.map(renderExpenseItem)}
                        {leftItems.length === 0 && (
                          <span className="text-muted-foreground text-xs italic">No items</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Operating Expenses (cont.)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <ExpensesHeader />
                        {rightItems.map(renderExpenseItem)}
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
              </TabsContent>

              <TabsContent value="key-metrics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Return Metrics</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <EditableRow label="Target Cap Rate" field="target_cap_rate" value={inputs.target_cap_rate} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Exit Cap Rate" field="exit_cap_rate" value={inputs.exit_cap_rate} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Target Cash-on-Cash Return" field="target_cash_on_cash" value={inputs.target_cash_on_cash} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Target IRR" field="target_irr" value={inputs.target_irr} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Target DSCR" field="target_dscr" value={inputs.target_dscr} onChange={updateInput} format="number" />
                        <EditableRow label="Target GRM" field="target_grm" value={inputs.target_grm} onChange={updateInput} format="number" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Growth &amp; Hold Assumptions</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <EditableRow label="Hold Period (years)" field="hold_period_years" value={inputs.hold_period_years} onChange={updateInput} format="number" />
                        <EditableRow label="Annual Rent Growth Rate" field="rent_growth_rate" value={inputs.rent_growth_rate} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Annual Expense Growth Rate" field="expense_growth_rate" value={inputs.expense_growth_rate} onChange={updateInput} format="percent" decimals={2} />
                        <EditableRow label="Closing Costs" field="closing_costs" value={inputs.closing_costs} onChange={updateInput} format="currency" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm font-medium">Computed vs. Target</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                      <ComparisonItem label="Cap Rate" actual={fmtPct(computed.capRate, 2)} target={inputs.target_cap_rate > 0 ? fmtPct(inputs.target_cap_rate, 2) : "—"} />
                      <ComparisonItem label="DSCR" actual={`${computed.dscr.toFixed(2)}x`} target={inputs.target_dscr > 0 ? `${inputs.target_dscr.toFixed(2)}x` : "—"} />
                      <ComparisonItem label="Cash-on-Cash" actual={fmtPct(computed.cashOnCash, 2)} target={inputs.target_cash_on_cash > 0 ? fmtPct(inputs.target_cash_on_cash, 2) : "—"} />
                      <ComparisonItem label="GRM" actual={computed.grm.toFixed(2)} target={inputs.target_grm > 0 ? inputs.target_grm.toFixed(2) : "—"} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Remove ${deleteTarget?.label || ""}?`}
        description={`Are you sure you want to remove ${deleteTarget?.label || "this expense"}? Its value will be reset to zero.`}
        onConfirm={confirmRemove}
      />
    </SidebarProvider>
  );
};

function ComparisonItem({ label, actual, target }: { label: string; actual: string; target: string }) {
  return (
    <div className="space-y-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">Actual</span>
        <span className="font-medium">{actual}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">Target</span>
        <span className="font-medium">{target}</span>
      </div>
    </div>
  );
}

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

function RemovableRow({ label, monthly, annual, onRemove }: {
  label: string;
  monthly: string;
  annual: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex justify-between group relative items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRemove}
              className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left"><p>Remove</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-4">
        <span className="w-28 text-right text-muted-foreground/70">{monthly}</span>
        <span className="w-28 text-right">{annual}</span>
      </div>
    </div>
  );
}

function RemovableEditableRow({ label, field, value, onChange, format, decimals, numUnits, isReservesPerUnit, onRemove }: {
  label: string;
  field: keyof ApartmentInputsType;
  value: number;
  onChange: (field: keyof ApartmentInputsType, value: string) => void;
  format: "currency" | "percent" | "number";
  decimals?: number;
  numUnits: number;
  isReservesPerUnit?: boolean;
  onRemove: () => void;
}) {
  const isPercent = format === "percent";
  const isCurrency = format === "currency";

  const monthlyValue = isCurrency
    ? (isReservesPerUnit
        ? value / 12
        : numUnits > 0 ? value / numUnits / 12 : 0)
    : 0;

  const [monthlyLocal, setMonthlyLocal] = useState(monthlyValue.toFixed(2));
  const [annualLocal, setAnnualLocal] = useState(String(value));
  const [focused, setFocused] = useState<"monthly" | "annual" | null>(null);
  const monthlyRef = useRef<HTMLInputElement>(null);
  const annualRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused !== "monthly") setMonthlyLocal(monthlyValue.toFixed(2));
  }, [monthlyValue, focused]);

  useEffect(() => {
    if (focused !== "annual") setAnnualLocal(String(value));
  }, [value, focused]);

  const handleMonthlyChange = (raw: string) => {
    setMonthlyLocal(raw);
    const num = parseFloat(raw) || 0;
    const annual = isReservesPerUnit ? num * 12 : num * numUnits * 12;
    onChange(field, String(annual));
  };

  const handleAnnualChange = (raw: string) => {
    setAnnualLocal(raw);
    onChange(field, raw);
  };

  return (
    <div className="flex justify-between group relative items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRemove}
              className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left"><p>Remove</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-4">
        {isPercent ? (
          <span className="w-28 text-right text-muted-foreground/40">—</span>
        ) : focused === "monthly" ? (
          <input
            ref={monthlyRef}
            type="text"
            autoFocus
            value={monthlyLocal}
            onChange={(e) => handleMonthlyChange(e.target.value)}
            onBlur={() => setFocused(null)}
            className="w-28 text-right text-sm bg-transparent border-none outline-none p-0 m-0"
          />
        ) : (
          <span
            className="w-28 text-right cursor-pointer hover:text-muted-foreground/70 transition-colors"
            onClick={() => {
              setFocused("monthly");
              setTimeout(() => monthlyRef.current?.select(), 0);
            }}
          >
            {fmt(monthlyValue)}
          </span>
        )}

        {isPercent && focused === "annual" ? (
          <input
            ref={annualRef}
            type="text"
            autoFocus
            value={annualLocal}
            onChange={(e) => handleAnnualChange(e.target.value)}
            onBlur={() => setFocused(null)}
            className="w-28 text-right text-sm bg-transparent border-none outline-none p-0 m-0"
          />
        ) : (
          <span
            className={`w-28 text-right transition-colors ${isPercent ? "cursor-pointer hover:text-muted-foreground/70" : ""}`}
            onClick={() => {
              if (!isPercent) return;
              setFocused("annual");
              setTimeout(() => annualRef.current?.select(), 0);
            }}
          >
            {formatDisplay(value, format, decimals)}
          </span>
        )}
      </div>
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
