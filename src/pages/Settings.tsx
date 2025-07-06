
import React from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditCostCodeDialog } from "@/components/EditCostCodeDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CostCodesTab } from "@/components/settings/CostCodesTab";
import { SpecificationsTab } from "@/components/settings/SpecificationsTab";
import { useState, useEffect } from "react";
import { useCostCodes } from "@/hooks/useCostCodes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;
type CostCodeSpecification = Tables<'cost_code_specifications'>;

// Combined type for specifications with cost code data
type SpecificationWithCostCode = CostCodeSpecification & {
  cost_code: CostCode;
};

const Settings = () => {
  const {
    costCodes,
    loading,
    addCostCode,
    updateCostCode,
    deleteCostCode,
    importCostCodes,
  } = useCostCodes();

  const { user } = useAuth();
  const { toast } = useToast();

  // Specifications state
  const [specifications, setSpecifications] = useState<SpecificationWithCostCode[]>([]);
  const [specificationsLoading, setSpecificationsLoading] = useState(true);

  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [costCodeToDelete, setCostCodeToDelete] = useState<CostCode | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Bulk selection state for cost codes
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Bulk selection state for specifications
  const [selectedSpecifications, setSelectedSpecifications] = useState<Set<string>>(new Set());
  const [bulkDeleteSpecsDialogOpen, setBulkDeleteSpecsDialogOpen] = useState(false);

  // Get all parent codes that have children
  const parentCodesWithChildren = new Set(
    costCodes
      .filter(cc => cc.parent_group)
      .map(cc => cc.parent_group)
      .filter(Boolean)
  );

  // Initialize collapsed state for specifications - now empty by default (all groups expanded)
  const [collapsedSpecGroups, setCollapsedSpecGroups] = useState<Set<string>>(new Set());

  // Fetch specifications
  const fetchSpecifications = async () => {
    if (!user) return;
    
    try {
      // First, get cost codes that have specifications enabled
      const { data: costCodesWithSpecs, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('has_specifications', true);

      if (costCodesError) throw costCodesError;

      if (!costCodesWithSpecs || costCodesWithSpecs.length === 0) {
        setSpecifications([]);
        setSpecificationsLoading(false);
        return;
      }

      // Get existing specification records
      const { data: existingSpecs, error: specsError } = await supabase
        .from('cost_code_specifications')
        .select('*')
        .in('cost_code_id', costCodesWithSpecs.map(cc => cc.id));

      if (specsError) throw specsError;

      // Create missing specification records
      const existingSpecCostCodeIds = new Set(existingSpecs?.map(spec => spec.cost_code_id) || []);
      const missingSpecs = costCodesWithSpecs
        .filter(cc => !existingSpecCostCodeIds.has(cc.id))
        .map(cc => ({
          cost_code_id: cc.id,
          description: null,
          files: []
        }));

      if (missingSpecs.length > 0) {
        const { error: insertError } = await supabase
          .from('cost_code_specifications')
          .insert(missingSpecs);

        if (insertError) throw insertError;
      }

      // Now fetch all specifications with cost code data
      const { data: allSpecs, error: finalError } = await supabase
        .from('cost_code_specifications')
        .select(`
          *,
          cost_code:cost_codes(*)
        `)
        .in('cost_code_id', costCodesWithSpecs.map(cc => cc.id));

      if (finalError) throw finalError;

      setSpecifications(allSpecs || []);
    } catch (error) {
      console.error('Error fetching specifications:', error);
      toast({
        title: "Error",
        description: "Failed to load specifications",
        variant: "destructive",
      });
    } finally {
      setSpecificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecifications();
  }, [user, costCodes]); // Also refresh when costCodes change

  useEffect(() => {
    // Don't automatically collapse any groups - leave them all expanded by default
    setCollapsedGroups(new Set());
    setCollapsedSpecGroups(new Set());
  }, [costCodes]);

  const toggleGroupCollapse = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const toggleSpecificationGroupCollapse = (groupKey: string) => {
    const newCollapsed = new Set(collapsedSpecGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedSpecGroups(newCollapsed);
  };

  // Cost code selection handlers
  const handleCostCodeSelect = (costCodeId: string, checked: boolean) => {
    const newSelected = new Set(selectedCostCodes);
    if (checked) {
      newSelected.add(costCodeId);
    } else {
      newSelected.delete(costCodeId);
    }
    setSelectedCostCodes(newSelected);
  };

  const handleSelectAllCostCodes = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(costCodes.map(cc => cc.id));
      setSelectedCostCodes(allIds);
    } else {
      setSelectedCostCodes(new Set());
    }
  };

  const handleBulkDeleteCostCodes = async () => {
    for (const id of selectedCostCodes) {
      await deleteCostCode(id);
    }
    setSelectedCostCodes(new Set());
    setBulkDeleteDialogOpen(false);
  };

  // Specification selection handlers
  const handleSpecificationSelect = (specId: string, checked: boolean) => {
    const newSelected = new Set(selectedSpecifications);
    if (checked) {
      newSelected.add(specId);
    } else {
      newSelected.delete(specId);
    }
    setSelectedSpecifications(newSelected);
  };

  const handleSelectAllSpecifications = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(specifications.map(spec => spec.id));
      setSelectedSpecifications(allIds);
    } else {
      setSelectedSpecifications(new Set());
    }
  };

  const handleBulkDeleteSpecifications = async () => {
    // Delete selected specifications
    for (const id of selectedSpecifications) {
      try {
        const { error } = await supabase
          .from('cost_code_specifications')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting specification:', error);
        toast({
          title: "Error",
          description: "Failed to delete specification",
          variant: "destructive",
        });
      }
    }
    setSelectedSpecifications(new Set());
    setBulkDeleteSpecsDialogOpen(false);
    fetchSpecifications(); // Refresh data
  };

  const handleEditSpecification = (spec: SpecificationWithCostCode) => {
    // For now, edit the underlying cost code
    setEditingCostCode(spec.cost_code);
    setEditDialogOpen(true);
  };

  const handleDeleteSpecification = (spec: SpecificationWithCostCode) => {
    // For now, we'll delete the specification record
    setCostCodeToDelete(spec.cost_code);
    setDeleteDialogOpen(true);
  };

  const handleUpdateSpecification = async (specId: string, updatedSpec: any) => {
    await updateCostCode(specId, updatedSpec);
  };

  const handleAddCostCode = async (newCostCode: any) => {
    console.log("Adding new cost code:", newCostCode);
    await addCostCode(newCostCode);
  };

  const handleUpdateCostCode = async (costCodeId: string, updatedCostCode: any) => {
    console.log("Updating cost code:", costCodeId, updatedCostCode);
    await updateCostCode(costCodeId, updatedCostCode);
  };

  const handleEditClick = (costCode: CostCode) => {
    setEditingCostCode(costCode);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (costCode: CostCode) => {
    setCostCodeToDelete(costCode);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (costCodeToDelete) {
      await deleteCostCode(costCodeToDelete.id);
      setCostCodeToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleImportCostCodes = async (importedCostCodes: any[]) => {
    console.log("Importing cost codes:", importedCostCodes);
    await importCostCodes(importedCostCodes);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-black">Settings</h1>
              </div>

              <Tabs defaultValue="cost-codes" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cost-codes">Cost Codes</TabsTrigger>
                  <TabsTrigger value="specifications">Specifications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cost-codes" className="mt-6">
                  <CostCodesTab
                    costCodes={costCodes}
                    loading={loading}
                    selectedCostCodes={selectedCostCodes}
                    collapsedGroups={collapsedGroups}
                    onCostCodeSelect={handleCostCodeSelect}
                    onSelectAllCostCodes={handleSelectAllCostCodes}
                    onToggleGroupCollapse={toggleGroupCollapse}
                    onAddCostCode={handleAddCostCode}
                    onUpdateCostCode={handleUpdateCostCode}
                    onEditCostCode={handleEditClick}
                    onDeleteCostCode={handleDeleteClick}
                    onImportCostCodes={handleImportCostCodes}
                    onBulkDeleteCostCodes={() => setBulkDeleteDialogOpen(true)}
                  />
                </TabsContent>
                
                <TabsContent value="specifications" className="mt-6">
                  <SpecificationsTab
                    specifications={specifications}
                    loading={specificationsLoading}
                    selectedSpecifications={selectedSpecifications}
                    collapsedGroups={collapsedSpecGroups}
                    onSpecificationSelect={handleSpecificationSelect}
                    onSelectAllSpecifications={handleSelectAllSpecifications}
                    onToggleGroupCollapse={toggleSpecificationGroupCollapse}
                    onBulkDeleteSpecifications={() => setBulkDeleteSpecsDialogOpen(true)}
                    onEditSpecification={handleEditSpecification}
                    onUpdateSpecification={handleUpdateSpecification}
                    onDeleteSpecification={handleDeleteSpecification}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>

        <EditCostCodeDialog
          costCode={editingCostCode}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
          onUpdateCostCode={handleUpdateCostCode}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this cost code?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the cost code "{costCodeToDelete?.name}" (Code: {costCodeToDelete?.code}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>No</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                Yes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Cost Codes</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCostCodes.size} selected cost code{selectedCostCodes.size !== 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteCostCodes} className="bg-red-600 hover:bg-red-700">
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteSpecsDialogOpen} onOpenChange={setBulkDeleteSpecsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Specifications</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedSpecifications.size} selected specification{selectedSpecifications.size !== 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBulkDeleteSpecsDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteSpecifications} className="bg-red-600 hover:bg-red-700">
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
