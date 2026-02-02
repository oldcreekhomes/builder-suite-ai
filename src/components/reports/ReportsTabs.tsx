import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceSheetContent } from "./BalanceSheetContent";
import { IncomeStatementContent } from "./IncomeStatementContent";
import { JobCostsContent } from "./JobCostsContent";
import { AccountsPayableContent } from "./AccountsPayableContent";
import { VendorPaymentsContent } from "./VendorPaymentsContent";

interface ReportsTabsProps {
  projectId?: string;
}

export function ReportsTabs({ projectId }: ReportsTabsProps) {
  return (
    <Tabs defaultValue="balance-sheet" className="w-full">
      <TabsList className="grid w-full max-w-4xl grid-cols-5">
        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
        <TabsTrigger value="job-costs">Job Costs</TabsTrigger>
        <TabsTrigger value="accounts-payable">Accounts Payable</TabsTrigger>
        <TabsTrigger value="vendor-payments">Vendor Payments</TabsTrigger>
      </TabsList>
      
      <TabsContent value="balance-sheet" className="mt-6">
        <BalanceSheetContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="income-statement" className="mt-6">
        <IncomeStatementContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="job-costs" className="mt-6">
        <JobCostsContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="accounts-payable" className="mt-6">
        <AccountsPayableContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="vendor-payments" className="mt-6">
        <VendorPaymentsContent projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
