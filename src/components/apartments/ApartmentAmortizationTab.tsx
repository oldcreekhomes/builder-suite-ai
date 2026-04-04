import { ApartmentInputs, calculateAmortization, calcMonthlyPayment } from "@/lib/apartmentCalculations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";

interface Props { inputs: ApartmentInputs; }

export default function ApartmentAmortizationTab({ inputs }: Props) {
  const rows = calculateAmortization(inputs);
  const monthlyPI = calcMonthlyPayment(inputs.loanAmount, inputs.interestRate, inputs.amortYears);

  const totalPrincipal = rows.reduce((s, r) => s + r.annualPrincipal, 0);
  const totalInterest = rows.reduce((s, r) => s + r.annualInterest, 0);
  const totalPayments = rows.reduce((s, r) => s + r.totalPayment, 0);

  return (
    <div className="max-w-5xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
        All loan inputs sourced from Inputs tab — do not edit this sheet directly.
      </div>

      {/* Loan header */}
      <div className="grid grid-cols-5 gap-4 mb-4 text-sm">
        <div><span className="text-muted-foreground">Loan Amount</span><br /><span className="font-semibold">{fmt(inputs.loanAmount)}</span></div>
        <div><span className="text-muted-foreground">Interest Rate</span><br /><span className="font-semibold">{fmtPct(inputs.interestRate)}</span></div>
        <div><span className="text-muted-foreground">Amort (Yrs)</span><br /><span className="font-semibold">{inputs.amortYears}</span></div>
        <div><span className="text-muted-foreground">Term (Yrs)</span><br /><span className="font-semibold">{inputs.loanTermYears}</span></div>
        <div><span className="text-muted-foreground">Monthly P&I</span><br /><span className="font-semibold">{fmt(monthlyPI)}</span></div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Beginning Balance ($)</TableHead>
            <TableHead className="text-right">Annual Principal ($)</TableHead>
            <TableHead className="text-right">Annual Interest ($)</TableHead>
            <TableHead className="text-right">Total Payment ($)</TableHead>
            <TableHead className="text-right">Ending Balance ($)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.year} className={row.year === inputs.loanTermYears ? 'bg-yellow-50' : row.isInterestOnly ? 'bg-orange-50/50' : ''}>
              <TableCell className="font-medium">{row.year}{row.isInterestOnly ? ' (I/O)' : ''}</TableCell>
              <TableCell className="text-right">{fmt(row.beginBalance)}</TableCell>
              <TableCell className="text-right">{fmt(row.annualPrincipal)}</TableCell>
              <TableCell className="text-right">{fmt(row.annualInterest)}</TableCell>
              <TableCell className="text-right">{fmt(row.totalPayment)}</TableCell>
              <TableCell className="text-right">{fmt(row.endBalance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold border-t-2">
            <TableCell>TOTAL</TableCell>
            <TableCell />
            <TableCell className="text-right">{fmt(totalPrincipal)}</TableCell>
            <TableCell className="text-right">{fmt(totalInterest)}</TableCell>
            <TableCell className="text-right">{fmt(totalPayments)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
