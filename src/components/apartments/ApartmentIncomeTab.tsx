import { ApartmentInputs, calculateIncome, calculateMetrics } from "@/lib/apartmentCalculations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";

interface Props { inputs: ApartmentInputs; }

export default function ApartmentIncomeTab({ inputs }: Props) {
  const income = calculateIncome(inputs);
  const metrics = calculateMetrics(inputs, income);
  const u = inputs.totalUnits;

  return (
    <div className="max-w-5xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
        All values calculated from Inputs tab — do not edit this sheet directly.
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Line Item</TableHead>
            <TableHead className="text-right">Per Unit / Mo ($)</TableHead>
            <TableHead className="text-right">Monthly Total ($)</TableHead>
            <TableHead className="text-right">Annual Total ($)</TableHead>
            <TableHead className="text-right">% of EGI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Revenue */}
          <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={5}>REVENUE</TableCell></TableRow>
          <TableRow>
            <TableCell>Gross Potential Rent (GPR)</TableCell>
            <TableCell className="text-right">{fmt(inputs.avgMonthlyRent)}</TableCell>
            <TableCell className="text-right">{fmt(income.gpr / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.gpr)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell>Other Income (parking, laundry, fees, etc.)</TableCell>
            <TableCell className="text-right">{fmt(inputs.otherIncomePerUnit)}</TableCell>
            <TableCell className="text-right">{fmt(income.otherIncome / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.otherIncome)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell>Less: Vacancy Loss</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.vacancyLoss / u / 12)}</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.vacancyLoss / 12)}</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.vacancyLoss)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell>Less: Credit Loss / Bad Debt</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.creditLoss / u / 12)}</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.creditLoss / 12)}</TableCell>
            <TableCell className="text-right text-destructive">{fmt(-income.creditLoss)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="font-semibold border-t-2">
            <TableCell>Effective Gross Income (EGI)</TableCell>
            <TableCell />
            <TableCell className="text-right">{fmt(income.egi / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.egi)}</TableCell>
            <TableCell className="text-right">100.0%</TableCell>
          </TableRow>

          {/* Operating Expenses */}
          <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={5}>OPERATING EXPENSES</TableCell></TableRow>
          {income.expenses.map(exp => (
            <TableRow key={exp.label}>
              <TableCell>{exp.label}</TableCell>
              <TableCell className="text-right">{fmt(exp.perUnitMo)}</TableCell>
              <TableCell className="text-right">{fmt(exp.monthly)}</TableCell>
              <TableCell className="text-right">{fmt(exp.annual)}</TableCell>
              <TableCell className="text-right">{fmtPct(exp.pctEgi)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold border-t-2">
            <TableCell>Total Operating Expenses</TableCell>
            <TableCell />
            <TableCell className="text-right">{fmt(income.totalExpenses / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.totalExpenses)}</TableCell>
            <TableCell className="text-right">{fmtPct(metrics.expenseRatio)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-muted/20">
            <TableCell>NET OPERATING INCOME (NOI)</TableCell>
            <TableCell />
            <TableCell className="text-right">{fmt(income.noi / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.noi)}</TableCell>
            <TableCell className="text-right">{fmtPct(income.egi > 0 ? income.noi / income.egi : 0)}</TableCell>
          </TableRow>

          {/* Debt Service */}
          <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={5}>DEBT SERVICE</TableCell></TableRow>
          <TableRow>
            <TableCell>Annual Debt Service (ADS)</TableCell>
            <TableCell />
            <TableCell className="text-right">{fmt(income.annualDebtService / 12)}</TableCell>
            <TableCell className="text-right">{fmt(income.annualDebtService)}</TableCell>
            <TableCell className="text-right">{fmtPct(income.egi > 0 ? income.annualDebtService / income.egi : 0)}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-muted/20">
            <TableCell>CASH FLOW AFTER DEBT SERVICE (CFADS)</TableCell>
            <TableCell />
            <TableCell className={`text-right ${income.cfads < 0 ? 'text-destructive' : ''}`}>{fmt(income.cfads / 12)}</TableCell>
            <TableCell className={`text-right ${income.cfads < 0 ? 'text-destructive' : ''}`}>{fmt(income.cfads)}</TableCell>
            <TableCell className={`text-right ${income.cfads < 0 ? 'text-destructive' : ''}`}>
              {income.egi > 0 ? `(${fmtPct(Math.abs(income.cfads / income.egi))})` : '—'}
            </TableCell>
          </TableRow>

          {/* Loan Summary */}
          <TableRow className="bg-muted/30 font-semibold"><TableCell colSpan={5}>LOAN SUMMARY & KEY METRICS</TableCell></TableRow>
          <TableRow><TableCell>Loan Amount</TableCell><TableCell /><TableCell className="text-right">{fmt(inputs.loanAmount)}</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>Interest Rate</TableCell><TableCell /><TableCell className="text-right">{fmtPct(inputs.interestRate)}</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>Loan Term</TableCell><TableCell /><TableCell className="text-right">{inputs.loanTermYears} yrs</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>DSCR</TableCell><TableCell /><TableCell className="text-right">{metrics.dscr.toFixed(2)}x</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>Cap Rate</TableCell><TableCell /><TableCell className="text-right">{fmtPct(metrics.capRate)}</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>Cash-on-Cash Return</TableCell><TableCell /><TableCell className="text-right">{fmtPct(metrics.cashOnCash)}</TableCell><TableCell /><TableCell /></TableRow>
          <TableRow><TableCell>Equity Required</TableCell><TableCell /><TableCell className="text-right">{fmt(metrics.equityRequired)}</TableCell><TableCell /><TableCell /></TableRow>
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground italic mt-4">
        DISCLAIMER: For planning purposes only. Consult qualified financial, legal, and tax advisors before making investment decisions.
      </p>
    </div>
  );
}
