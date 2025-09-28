import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillsApprovalTable } from "./BillsApprovalTable";
import { useBillCounts } from "@/hooks/useBillCounts";

export function BillsApprovalTabs() {
  const [activeTab, setActiveTab] = useState("pending");
  const { data: counts, isLoading } = useBillCounts();

  const getTabLabel = (status: string, count: number | undefined) => {
    if (isLoading) {
      switch (status) {
        case 'pending':
          return "Pending";
        case 'rejected':
          return "Rejected";
        case 'approved':
          return "Approved";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'pending':
        return `Pending (${displayCount})`;
      case 'rejected':
        return `Rejected (${displayCount})`;
      case 'approved':
        return `Approved (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pending">
          {getTabLabel('pending', counts?.pendingCount)}
        </TabsTrigger>
        <TabsTrigger value="rejected">
          {getTabLabel('rejected', counts?.rejectedCount)}
        </TabsTrigger>
        <TabsTrigger value="approved">
          {getTabLabel('approved', counts?.approvedCount)}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="pending" className="mt-6">
        <BillsApprovalTable status="draft" />
      </TabsContent>
      
      <TabsContent value="rejected" className="mt-6">
        <BillsApprovalTable status="void" />
      </TabsContent>
      
      <TabsContent value="approved" className="mt-6">
        <BillsApprovalTable status="posted" />
      </TabsContent>
    </Tabs>
  );
}