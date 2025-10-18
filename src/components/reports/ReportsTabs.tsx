import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceSheetContent } from "./BalanceSheetContent";
import { IncomeStatementContent } from "./IncomeStatementContent";

interface ReportsTabsProps {
  projectId?: string;
}

export function ReportsTabs({ projectId }: ReportsTabsProps) {
  return (
    <Tabs defaultValue="balance-sheet" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
      </TabsList>
      
      <TabsContent value="balance-sheet" className="mt-6">
        <BalanceSheetContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="income-statement" className="mt-6">
        <IncomeStatementContent projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
