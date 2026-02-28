import { useState } from "react";
import { FileText } from "lucide-react";
import { ContentSidebar } from "@/components/ui/ContentSidebar";
import { BalanceSheetContent } from "./BalanceSheetContent";
import { IncomeStatementContent } from "./IncomeStatementContent";
import { JobCostsContent } from "./JobCostsContent";
import { AccountsPayableContent } from "./AccountsPayableContent";

interface ReportsTabsProps {
  projectId?: string;
}

const items = [
  { value: "balance-sheet", label: "Balance Sheet" },
  { value: "income-statement", label: "Income Statement" },
  { value: "job-costs", label: "Job Costs" },
  { value: "accounts-payable", label: "Accounts Payable" },
];

export function ReportsTabs({ projectId }: ReportsTabsProps) {
  const [active, setActive] = useState("balance-sheet");

  return (
    <div className="flex flex-1 overflow-hidden">
      <ContentSidebar
        title="Report Type"
        icon={FileText}
        items={items}
        activeItem={active}
        onItemChange={setActive}
      />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        {active === "balance-sheet" && <BalanceSheetContent projectId={projectId} />}
        {active === "income-statement" && <IncomeStatementContent projectId={projectId} />}
        {active === "job-costs" && <JobCostsContent projectId={projectId} />}
        {active === "accounts-payable" && <AccountsPayableContent projectId={projectId} />}
      </div>
    </div>
  );
}
