import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

function generateAmortization(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 12;
  const totalPayments = years * 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);

  const rows: { year: number; beginningBalance: number; totalPayment: number; totalPrincipal: number; totalInterest: number; endingBalance: number }[] = [];

  let balance = principal;
  for (let yr = 1; yr <= years; yr++) {
    const beginBal = balance;
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      const principalPmt = monthlyPayment - interest;
      yearInterest += interest;
      yearPrincipal += principalPmt;
      balance -= principalPmt;
    }

    rows.push({
      year: yr,
      beginningBalance: beginBal,
      totalPayment: monthlyPayment * 12,
      totalPrincipal: yearPrincipal,
      totalInterest: yearInterest,
      endingBalance: Math.max(balance, 0),
    });
  }
  return rows;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ApartmentAmortizationSchedule = () => {
  const rows = useMemo(() => generateAmortization(18_750_000, 0.065, 30), []);

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center h-12 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold ml-2">Amortization Schedule</h1>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Loan Amortization Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Year</th>
                      <th className="text-right py-2 px-4 font-medium">Beginning Balance</th>
                      <th className="text-right py-2 px-4 font-medium">Total Payment</th>
                      <th className="text-right py-2 px-4 font-medium">Principal</th>
                      <th className="text-right py-2 px-4 font-medium">Interest</th>
                      <th className="text-right py-2 pl-4 font-medium">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.year} className="hover:bg-muted/50">
                        <td className="py-1.5 pr-4">{r.year}</td>
                        <td className="py-1.5 px-4 text-right">{fmt(r.beginningBalance)}</td>
                        <td className="py-1.5 px-4 text-right">{fmt(r.totalPayment)}</td>
                        <td className="py-1.5 px-4 text-right">{fmt(r.totalPrincipal)}</td>
                        <td className="py-1.5 px-4 text-right">{fmt(r.totalInterest)}</td>
                        <td className="py-1.5 pl-4 text-right">{fmt(r.endingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default ApartmentAmortizationSchedule;
