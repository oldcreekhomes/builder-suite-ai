import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ApartmentDashboard = () => {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center h-12 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold ml-2">Apartment Dashboard</h1>
        </header>
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Row 1: Income Summary + Loan Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Income Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="Number of Units" value="200" />
                  <Row label="Gross Potential Rent (Annual)" value="$3,600,000" />
                  <Row label="Vacancy Loss (5%)" value="($180,000)" className="text-destructive" />
                  <Row label="Effective Gross Income" value="$3,420,000" bold />
                  <Row label="Total Operating Expenses" value="($1,710,000)" className="text-destructive" />
                  <Row label="Net Operating Income (NOI)" value="$1,710,000" bold />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Loan Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="Purchase Price" value="$25,000,000" />
                  <Row label="Loan-to-Value (LTV)" value="75%" />
                  <Row label="Loan Amount" value="$18,750,000" />
                  <Row label="Interest Rate" value="6.50%" />
                  <Row label="Amortization Period" value="30 years" />
                  <Row label="Annual Debt Service" value="($1,421,016)" className="text-destructive" />
                  <Row label="DSCR" value="1.20x" bold />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Expense & NOI Summary */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Expense &amp; NOI Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="space-y-2">
                  <Row label="Taxes" value="$500,000" />
                  <Row label="Insurance" value="$250,000" />
                  <Row label="Utilities" value="$200,000" />
                  <Row label="Repairs & Maintenance" value="$180,000" />
                </div>
                <div className="space-y-2">
                  <Row label="Management Fee (5%)" value="$171,000" />
                  <Row label="Payroll" value="$200,000" />
                  <Row label="General & Administrative" value="$100,000" />
                  <Row label="Marketing" value="$50,000" />
                </div>
                <div className="space-y-2">
                  <Row label="Reserves (per unit)" value="$59,000" />
                  <Row label="Total Operating Expenses" value="$1,710,000" bold />
                  <Row label="NOI" value="$1,710,000" bold />
                  <Row label="Expense Ratio" value="50.0%" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Property Assumptions + Key Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Property Assumptions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="Number of Units" value="200" />
                  <Row label="Average Rent per Unit" value="$1,500/mo" />
                  <Row label="Vacancy Rate" value="5%" />
                  <Row label="Operating Expense Ratio" value="50%" />
                  <Row label="Cap Rate" value="6.84%" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Key Performance Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <Row label="Cash-on-Cash Return" value="4.62%" />
                  <Row label="Debt Service Coverage Ratio" value="1.20x" />
                  <Row label="Cash Flow After Debt Service" value="$288,984" />
                  <Row label="Price Per Unit" value="$125,000" />
                  <Row label="GRM (Gross Rent Multiplier)" value="6.94" />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
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

export default ApartmentDashboard;
