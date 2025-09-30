import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiddingTable } from "./BiddingTable";
import { useBiddingCounts } from "@/hooks/useBiddingCounts";

interface BiddingTabsProps {
  projectId: string;
  projectAddress?: string;
}

export function BiddingTabs({ projectId, projectAddress }: BiddingTabsProps) {
  const [activeTab, setActiveTab] = useState("draft");
  const { data: counts, isLoading } = useBiddingCounts(projectId);

  const getTabLabel = (status: string, count: number | undefined) => {
    if (isLoading) {
      switch (status) {
        case 'draft':
          return "Draft";
        case 'sent':
          return "Bidding";
        case 'closed':
          return "Closed";
        default:
          return status;
      }
    }

    const displayCount = count || 0;
    switch (status) {
      case 'draft':
        return `Draft (${displayCount})`;
      case 'sent':
        return `Bidding (${displayCount})`;
      case 'closed':
        return `Closed (${displayCount})`;
      default:
        return `${status} (${displayCount})`;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="draft" className="text-yellow-500 data-[state=active]:text-yellow-500">
          {getTabLabel('draft', counts?.draftCount)}
        </TabsTrigger>
        <TabsTrigger value="sent" className="text-green-600 data-[state=active]:text-green-600">
          {getTabLabel('sent', counts?.sentCount)}
        </TabsTrigger>
        <TabsTrigger value="closed" className="text-blue-900 data-[state=active]:text-blue-900">
          {getTabLabel('closed', counts?.closedCount)}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="draft" className="mt-6">
        <BiddingTable 
          projectId={projectId} 
          projectAddress={projectAddress}
          status="draft"
        />
      </TabsContent>
      
      <TabsContent value="sent" className="mt-6">
        <BiddingTable 
          projectId={projectId} 
          projectAddress={projectAddress}
          status="sent"
        />
      </TabsContent>
      
      <TabsContent value="closed" className="mt-6">
        <BiddingTable 
          projectId={projectId} 
          projectAddress={projectAddress}
          status="closed"
        />
      </TabsContent>
    </Tabs>
  );
}