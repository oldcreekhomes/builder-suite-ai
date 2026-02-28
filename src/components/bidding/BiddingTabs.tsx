import { useState } from "react";
import { Gavel } from "lucide-react";
import { ContentSidebar } from "@/components/ui/ContentSidebar";
import { BiddingTable } from "./BiddingTable";
import { useBiddingCounts } from "@/hooks/useBiddingCounts";

interface BiddingTabsProps {
  projectId: string;
  projectAddress?: string;
}

export function BiddingTabs({ projectId, projectAddress }: BiddingTabsProps) {
  const [active, setActive] = useState("draft");
  const { data: counts, isLoading } = useBiddingCounts(projectId);

  const getLabel = (status: string, count: number | undefined) => {
    const base = status === "draft" ? "Draft" : status === "sent" ? "Bidding" : "Closed";
    if (isLoading) return base;
    return `${base} (${count || 0})`;
  };

  const items = [
    { value: "draft", label: getLabel("draft", counts?.draftCount) },
    { value: "sent", label: getLabel("sent", counts?.sentCount) },
    { value: "closed", label: getLabel("closed", counts?.closedCount) },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <ContentSidebar
        title="Bid Status"
        icon={Gavel}
        items={items}
        activeItem={active}
        onItemChange={setActive}
      />
      <div className="flex-1 min-w-0 px-6 pt-0 pb-6 overflow-auto">
        <BiddingTable
          projectId={projectId}
          projectAddress={projectAddress}
          status={active as "draft" | "sent" | "closed"}
        />
      </div>
    </div>
  );
}
