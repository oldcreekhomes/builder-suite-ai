import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PlanViewer } from "@/components/estimate/PlanViewer";
import { TakeoffTable } from "@/components/estimate/TakeoffTable";
import { SheetSelector } from "@/components/estimate/SheetSelector";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function TakeoffEditor() {
  const { projectId, takeoffId } = useParams();
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<{ id: string; color: string; category: string } | null>(null);

  const { data: takeoff } = useQuery({
    queryKey: ['takeoff-project', takeoffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('takeoff_projects')
        .select('*')
        .eq('id', takeoffId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!takeoffId,
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title={takeoff?.name || "Takeoff Editor"}
          />
          
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={20} minSize={15}>
              <SheetSelector 
                takeoffId={takeoffId!}
                selectedSheetId={selectedSheetId}
                onSelectSheet={setSelectedSheetId}
              />
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <PlanViewer 
                sheetId={selectedSheetId}
                takeoffId={takeoffId!}
                selectedTakeoffItem={selectedReviewItem}
              />
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={30} minSize={20}>
              <TakeoffTable 
                sheetId={selectedSheetId}
                takeoffId={takeoffId!}
                selectedReviewItem={selectedReviewItem}
                onSelectReviewItem={setSelectedReviewItem}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
