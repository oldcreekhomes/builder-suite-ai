import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useApartmentInputs, fmt, fmtPct } from "@/hooks/useApartmentInputs";
import { useProject } from "@/hooks/useProject";
import { Loader2, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { ApartmentAmortizationPdfDocument } from "@/components/apartments/pdf/ApartmentAmortizationPdfDocument";
import { toast } from "@/hooks/use-toast";

function generateAmortization(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 12;
  const totalPayments = years * 12;
  if (monthlyRate <= 0 || totalPayments <= 0 || principal <= 0) return { rows: [], monthlyPayment: 0 };

  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);

  const rows: { year: number; beginningBalance: number; totalPayment: number; totalPrincipal: number; totalInterest: number; endingBalance: number; monthlyPayment: number; monthlyPrincipal: number; monthlyInterest: number }[] = [];

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
      monthlyPayment,
      monthlyPrincipal: yearPrincipal / 12,
      monthlyInterest: yearInterest / 12,
    });
  }
  return { rows, monthlyPayment };
}

const ApartmentAmortizationSchedule = () => {
  const { projectId } = useParams();
  const { inputs, computed, isLoading } = useApartmentInputs(projectId);

  const amortization = useMemo(
    () => generateAmortization(computed.loanAmount, inputs.interest_rate / 100, inputs.amortization_years),
    [computed.loanAmount, inputs.interest_rate, inputs.amortization_years]
  );
  const { rows, monthlyPayment } = amortization;
  const { data: project } = useProject(projectId || "");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(
        <ApartmentAmortizationPdfDocument
          projectAddress={project?.address}
          loanAmount={computed.loanAmount}
          interestRate={inputs.interest_rate}
          amortizationYears={inputs.amortization_years}
          loanTermYears={inputs.loan_term_years}
          monthlyPayment={monthlyPayment}
          rows={rows}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      link.href = url;
      link.download = `Apartment_Amortization-${stamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF exported", description: "Your amortization schedule PDF has been downloaded" });
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", description: "Could not generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportButton = (
    <Button onClick={handleExportPdf} disabled={isExporting || isLoading} size="sm" variant="outline">
      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      Export PDF
    </Button>
  );

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader title="Amortization Schedule" subtitle="Loan amortization breakdown by year." projectId={projectId} headerAction={exportButton} />
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
          <DashboardHeader title="Amortization Schedule" subtitle="Loan amortization breakdown by year." projectId={projectId} headerAction={exportButton} />
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6 overflow-auto">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Loan Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Loan Amount</span>
                    <p className="font-semibold">{fmt(computed.loanAmount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Interest Rate</span>
                    <p className="font-semibold">{fmtPct(inputs.interest_rate, 2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amortization</span>
                    <p className="font-semibold">{inputs.amortization_years} years</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loan Term</span>
                    <p className="font-semibold">{inputs.loan_term_years} years</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly Payment</span>
                    <p className="font-semibold">{fmt(monthlyPayment)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Loan Amortization Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">Year</th>
                        <th className="text-right py-2 px-4 font-medium">Beginning Balance</th>
                        <th className="text-right py-2 px-4 font-medium">Annual Payment</th>
                        <th className="text-right py-2 px-4 font-medium">Annual Principal</th>
                        <th className="text-right py-2 px-4 font-medium">Annual Interest</th>
                        <th className="text-right py-2 px-4 font-medium">Monthly Payment</th>
                        <th className="text-right py-2 px-4 font-medium">Monthly Principal</th>
                        <th className="text-right py-2 px-4 font-medium">Monthly Interest</th>
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
                          <td className="py-1.5 px-4 text-right">{fmt(r.monthlyPayment)}</td>
                          <td className="py-1.5 px-4 text-right">{fmt(r.monthlyPrincipal)}</td>
                          <td className="py-1.5 px-4 text-right">{fmt(r.monthlyInterest)}</td>
                          <td className="py-1.5 pl-4 text-right">{fmt(r.endingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ApartmentAmortizationSchedule;
