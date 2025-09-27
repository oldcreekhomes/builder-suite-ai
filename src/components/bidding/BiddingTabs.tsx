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
      return "Packages";
    }

    const displayCount = count || 0;
    return `Packages (${displayCount})`;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="draft">
          {getTabLabel('draft', counts?.draftCount)}
        </TabsTrigger>
        <TabsTrigger value="sent">
          {getTabLabel('sent', counts?.sentCount)}
        </TabsTrigger>
        <TabsTrigger value="closed">
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