import { ApartmentInputs, calculateIncome, calculateMetrics } from "@/lib/apartmentCalculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";

interface Props { inputs: ApartmentInputs; }

export default function ApartmentDashboardTab({ inputs }: Props) {
  const income = calculateIncome(inputs);
  const metrics = calculateMetrics(inputs, income);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Summary */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Income Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Gross Potential Rent" monthly={income.gpr / 12} annual={income.gpr} />
            <Row label="Other Income" monthly={income.otherIncome / 12} annual={income.otherIncome} />
            <Row label="Less: Vacancy & Credit Loss" monthly={-(income.vacancyLoss + income.creditLoss) / 12} annual={-(income.vacancyLoss + income.creditLoss)} negative />
            <div className="border-t pt-1 font-semibold">
              <Row label="Effective Gross Income (EGI)" monthly={income.egi / 12} annual={income.egi} />
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Loan Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <MetricRow label="Loan Amount" value={fmt(inputs.loanAmount)} />
            <MetricRow label="Interest Rate" value={fmtPct(inputs.interestRate)} />
            <MetricRow label="Loan Term" value={`${inputs.loanTermYears} yrs`} />
            <MetricRow label="Amort Period" value={`${inputs.amortYears} yrs`} />
            <MetricRow label="I/O Period" value={`${inputs.interestOnlyYears} yrs`} />
            <MetricRow label="Monthly P&I" value={fmt(income.monthlyDebtService)} />
            <MetricRow label="Annual Debt Service" value={fmt(income.annualDebtService)} />
          </CardContent>
        </Card>

        {/* Expense & NOI */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Expense & NOI Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Total Operating Expenses" monthly={income.totalExpenses / 12} annual={income.totalExpenses} />
            <Row label="Net Operating Income (NOI)" monthly={income.noi / 12} annual={income.noi} />
            <Row label="Annual Debt Service (ADS)" monthly={income.annualDebtService / 12} annual={income.annualDebtService} />
            <div className="border-t pt-1 font-semibold">
              <Row label="Cash Flow After Debt Service" monthly={income.cfads / 12} annual={income.cfads} />
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Key Performance Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <MetricRow label="LTV" value={fmtPct(metrics.ltv)} benchmark="≤ 75%" />
            <MetricRow label="LTC" value={fmtPct(metrics.ltc)} benchmark="≤ 80%" />
            <MetricRow label="DSCR" value={metrics.dscr.toFixed(2) + "x"} benchmark="≥ 1.25x" />
            <MetricRow label="Cap Rate" value={fmtPct(metrics.capRate)} benchmark="4–6% typical" />
            <MetricRow label="Cash-on-Cash Return" value={fmtPct(metrics.cashOnCash)} benchmark="6–10% target" />
            <MetricRow label="Break-Even Occupancy" value={fmtPct(metrics.breakEvenOccupancy)} benchmark="< 85%" />
            <MetricRow label="Equity Required" value={fmt(metrics.equityRequired)} />
            <MetricRow label="Total Project Cost" value={fmt(inputs.totalProjectCost)} />
            <MetricRow label="Appraised Value" value={fmt(inputs.appraisedValue)} />
          </CardContent>
        </Card>

        {/* Property Assumptions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Property Assumptions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <MetricRow label="Total Units" value={inputs.totalUnits.toString()} />
            <MetricRow label="Avg Rent / Unit / Mo" value={fmt(inputs.avgMonthlyRent)} />
            <MetricRow label="Vacancy Rate" value={fmtPct(inputs.vacancyRate)} />
            <MetricRow label="Credit Loss Rate" value={fmtPct(inputs.creditLossRate)} />
            <MetricRow label="Expense Ratio" value={fmtPct(metrics.expenseRatio)} />
            <MetricRow label="NOI per Unit (Annual)" value={fmt(metrics.noiPerUnit)} />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground italic">
        DISCLAIMER: For planning purposes only. Consult qualified financial, legal, and tax advisors before making investment decisions.
      </p>
    </div>
  );
}

function Row({ label, monthly, annual, negative }: { label: string; monthly: number; annual: number; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <div className="flex gap-6">
        <span className={`w-24 text-right ${(monthly < 0 || negative) ? 'text-destructive' : ''}`}>{fmt(monthly)}</span>
        <span className={`w-28 text-right ${(annual < 0 || negative) ? 'text-destructive' : ''}`}>{fmt(annual)}</span>
      </div>
    </div>
  );
}

function MetricRow({ label, value, benchmark }: { label: string; value: string; benchmark?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <div className="flex gap-4">
        <span className="font-medium">{value}</span>
        {benchmark && <span className="text-muted-foreground text-xs">{benchmark}</span>}
      </div>
    </div>
  );
}
