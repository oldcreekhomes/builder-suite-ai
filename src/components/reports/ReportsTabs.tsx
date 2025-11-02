import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceSheetContent } from "./BalanceSheetContent";
import { IncomeStatementContent } from "./IncomeStatementContent";
import { JobCostsContent } from "./JobCostsContent";

interface ReportsTabsProps {
  projectId?: string;
}

export function ReportsTabs({ projectId }: ReportsTabsProps) {
  return (
    <Tabs defaultValue="job-costs" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="job-costs">Job Costs</TabsTrigger>
        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
      </TabsList>
      
      <TabsContent value="job-costs" className="mt-6">
        <JobCostsContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="balance-sheet" className="mt-6">
        <BalanceSheetContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="income-statement" className="mt-6">
        <IncomeStatementContent projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
