import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillsReviewTable } from "./BillsReviewTable";
import { BillsApprovalTable } from "./BillsApprovalTable";
import { PayBillsTable } from "./PayBillsTable";
import { useBillCounts } from "@/hooks/useBillCounts";

interface BillsApprovalTabsProps {
  projectId?: string;
  projectIds?: string[];
}

export function BillsApprovalTabs({ projectId, projectIds }: BillsApprovalTabsProps) {
  const [activeTab, setActiveTab] = useState("review");
  const { data: counts, isLoading: countsLoading } = useBillCounts(projectId, projectIds);

  const getTabLabel = (status: string, count: number | undefined) => {
    if (countsLoading) {
      switch (status) {
        case 'draft':
          return "Review";
        case 'posted':
          return "Approve";
        case 'pay':
          return "Pay";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'draft':
        return `Review (${displayCount})`;
      case 'posted':
        return `Approve (${displayCount})`;
      case 'pay':
        return `Pay (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="review">
          {getTabLabel('draft', counts?.pendingCount)}
        </TabsTrigger>
        <TabsTrigger value="approve">
          {getTabLabel('posted', counts?.approvedCount)}
        </TabsTrigger>
        <TabsTrigger value="pay">
          {getTabLabel('pay', counts?.payBillsCount)}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="review" className="mt-6">
        <BillsReviewTable 
          projectId={projectId}
          projectIds={projectIds}
          showProjectColumn={!projectId}
        />
      </TabsContent>
      
      <TabsContent value="approve" className="mt-6">
        <BillsApprovalTable 
          status="draft"
          projectId={projectId}
          projectIds={projectIds}
          showProjectColumn={!projectId}
        />
      </TabsContent>
      
      <TabsContent value="pay" className="mt-6">
        <PayBillsTable 
          projectId={projectId}
          projectIds={projectIds}
          showProjectColumn={!projectId}
        />
      </TabsContent>
    </Tabs>
  );
}
