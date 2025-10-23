import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PlanViewer } from "@/components/estimate/PlanViewer";
import { TakeoffTable } from "@/components/estimate/TakeoffTable";
import { SheetSelector } from "@/components/estimate/SheetSelector";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function TakeoffEditor() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<{ id: string; color: string; category: string } | null>(null);
  const [visibleAnnotations, setVisibleAnnotations] = useState<Set<string>>(new Set());

  // Fetch or create takeoff project for this project
  const { data: takeoff } = useQuery({
    queryKey: ['takeoff-project', projectId],
    queryFn: async () => {
      if (!projectId || !user) return null;

      // First, try to fetch existing takeoff project
      const { data: existingTakeoff, error: fetchError } = await supabase
        .from('takeoff_projects')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If exists, return it
      if (existingTakeoff) {
        return existingTakeoff;
      }

      // If not, create a default one
      const { data: newTakeoff, error: createError } = await supabase
        .from('takeoff_projects')
        .insert({
          project_id: projectId,
          owner_id: user.id,
          name: 'Sheet Elevations',
          description: null,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newTakeoff;
    },
    enabled: !!projectId && !!user,
  });

  // Fetch takeoff items for the selected sheet to initialize visibility
  const { data: takeoffItems } = useQuery({
    queryKey: ['takeoff-items-visibility', selectedSheetId],
    queryFn: async () => {
      if (!selectedSheetId) return [];
      const { data, error } = await supabase
        .from('takeoff_items')
        .select('id')
        .eq('takeoff_sheet_id', selectedSheetId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSheetId,
  });

  // Add new items to visibility when they load (don't replace existing visibility state)
  useEffect(() => {
    if (takeoffItems && takeoffItems.length > 0) {
      setVisibleAnnotations(prev => {
        const next = new Set(prev);
        takeoffItems.forEach(item => next.add(item.id));
        return next;
      });
    }
  }, [takeoffItems]);

  // Reset visibility state when switching sheets
  useEffect(() => {
    setVisibleAnnotations(new Set());
  }, [selectedSheetId]);

  const handleToggleVisibility = (itemId: string) => {
    console.log('🎯 handleToggleVisibility called:', {
      itemId,
      visibleBefore: Array.from(visibleAnnotations),
    });
    
    setVisibleAnnotations(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      
      console.log('✅ Visibility toggled:', {
        itemId,
        visibleAfter: Array.from(next),
        wasVisible: prev.has(itemId),
        nowVisible: next.has(itemId)
      });
      
      return next;
    });
  };

  const handleShowAllAnnotations = () => {
    if (takeoffItems && takeoffItems.length > 0) {
      setVisibleAnnotations(new Set(takeoffItems.map(item => item.id)));
    }
  };

  const handleItemsAdded = (itemIds: string[]) => {
    console.log('🎉 New items added, making them visible:', itemIds);
    setVisibleAnnotations(prev => {
      const next = new Set(prev);
      itemIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleItemsExtracted = (sheetIds: string[], itemIds: string[]) => {
    console.log('🎉 Items extracted from upload:', { sheetIds, itemIds });
    
    // Make all extracted items visible immediately
    setVisibleAnnotations(prev => {
      const next = new Set(prev);
      itemIds.forEach(id => next.add(id));
      return next;
    });
    
    // If no sheet is selected, auto-select the first uploaded sheet
    if (!selectedSheetId && sheetIds.length > 0) {
      setSelectedSheetId(sheetIds[0]);
    }
  };

  // Show loading state while takeoff is being fetched/created
  if (!takeoff) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader 
              title="Estimate & Takeoff"
              projectId={projectId}
            />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-lg text-muted-foreground">Loading...</div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title={takeoff.name || "Estimate & Takeoff"}
            projectId={projectId}
          />
          
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={20} minSize={15}>
            <SheetSelector 
              takeoffId={takeoff.id} 
              selectedSheetId={selectedSheetId}
              onSelectSheet={setSelectedSheetId}
              onItemsExtracted={handleItemsExtracted}
            />
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <PlanViewer 
                sheetId={selectedSheetId}
                takeoffId={takeoff.id}
                selectedTakeoffItem={selectedReviewItem}
                visibleAnnotations={visibleAnnotations}
                onToggleVisibility={handleToggleVisibility}
                onShowAllAnnotations={handleShowAllAnnotations}
              />
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={30} minSize={20}>
              <TakeoffTable 
                sheetId={selectedSheetId}
                takeoffId={takeoff.id}
                selectedReviewItem={selectedReviewItem}
                onSelectReviewItem={setSelectedReviewItem}
                visibleAnnotations={visibleAnnotations}
                onToggleVisibility={handleToggleVisibility}
                onItemsAdded={handleItemsAdded}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
