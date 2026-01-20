import React from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditCostCodeDialog } from "@/components/EditCostCodeDialog";
import { EditSpecificationDescriptionDialog } from "@/components/settings/EditSpecificationDescriptionDialog";
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
import { ChartOfAccountsTab } from "@/components/settings/ChartOfAccountsTab";
import { BudgetWarningsTab } from "@/components/settings/BudgetWarningsTab";
import { DashboardSettingsTab } from "@/components/settings/DashboardSettingsTab";
import { AwayMessageSettings } from "@/components/settings/AwayMessageSettings";
import { useCostCodes } from "@/hooks/useCostCodes";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useCostCodeHandlers } from "@/hooks/useCostCodeHandlers";
import { useSettingsDialogs } from "@/hooks/useSettingsDialogs";
import type { CostCode, SpecificationWithCostCode } from "@/types/settings";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Settings = () => {
  const { user } = useAuth();
  
  const {
    costCodes,
    loading,
    addCostCode,
    updateCostCode,
    deleteCostCode,
    importCostCodes,
    refetch,
  } = useCostCodes();

  // Fetch price history counts for all cost codes
  const { data: priceHistoryCounts = {} } = useQuery({
    queryKey: ['price-history-counts', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      // Get the correct owner_id (home builder for employees, user.id for owners)
      const { data: info } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = info?.[0]?.is_employee ? info[0].home_builder_id : user.id;
      
      const { data, error } = await supabase
        .from('cost_code_price_history')
        .select('cost_code_id')
        .eq('owner_id', ownerId);
      
      if (error) throw error;
      
      // Count entries per cost code
      const counts: Record<string, number> = {};
      data?.forEach(entry => {
        counts[entry.cost_code_id] = (counts[entry.cost_code_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: !!user?.id,
  });

  // Specifications state and handlers
  const {
    specifications,
    specificationsLoading,
    selectedSpecifications,
    collapsedSpecGroups,
    handleUpdateSpecificationDescription,
    handleSpecificationFileUpload,
    handleDeleteAllSpecificationFiles,
    handleDeleteIndividualSpecificationFile,
    handleSpecificationSelect,
    handleSelectAllSpecifications,
    handleBulkDeleteSpecifications,
    handleConfirmDeleteSpecification,
    toggleSpecificationGroupCollapse,
  } = useSpecifications(costCodes);

  // Cost code handlers
  const {
    selectedCostCodes,
    collapsedGroups,
    handleAddCostCode,
    handleUpdateCostCode,
    handleImportCostCodes,
    handleCostCodeSelect,
    handleSelectAllCostCodes,
    handleBulkDeleteCostCodes,
    toggleGroupCollapse,
  } = useCostCodeHandlers(costCodes, addCostCode, updateCostCode, deleteCostCode, importCostCodes);

  // Dialog state and handlers
  const {
    editingCostCode,
    editingSpecification,
    editDialogOpen,
    descriptionDialogOpen,
    deleteDialogOpen,
    deleteSpecDialogOpen,
    costCodeToDelete,
    specToDelete,
    bulkDeleteDialogOpen,
    bulkDeleteSpecsDialogOpen,
    setEditDialogOpen,
    setDescriptionDialogOpen,
    setDeleteDialogOpen,
    setDeleteSpecDialogOpen,
    setCostCodeToDelete,
    setBulkDeleteDialogOpen,
    setBulkDeleteSpecsDialogOpen,
    handleEditClick,
    handleDeleteClick,
    handleEditSpecificationDescription,
    handleDeleteSpecificationClick,
  } = useSettingsDialogs();

  const handleUpdateSpecification = async (specId: string, updatedSpec: any) => {
    await updateCostCode(specId, updatedSpec);
  };

  const handleConfirmDelete = async () => {
    if (costCodeToDelete) {
      await deleteCostCode(costCodeToDelete.id);
      setCostCodeToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <UniversalFilePreviewProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <DashboardHeader />
            <div className="flex-1 flex">
              <Tabs defaultValue="cost-codes" orientation="vertical" className="flex w-full">
                <div className="w-52 shrink-0 border-r border-border bg-background p-4">
                  <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
                  <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
                    <TabsTrigger value="cost-codes" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Cost Codes</TabsTrigger>
                    <TabsTrigger value="specifications" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Specifications</TabsTrigger>
                    <TabsTrigger value="chart-of-accounts" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Chart of Accounts</TabsTrigger>
                    <TabsTrigger value="budget" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Budget</TabsTrigger>
                    <TabsTrigger value="dashboard" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Dashboard</TabsTrigger>
                    <TabsTrigger value="away-message" className="justify-start w-full px-3 py-2.5 border-l-2 border-transparent data-[state=active]:border-l-primary data-[state=active]:bg-muted rounded-none text-sm">Away Message</TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 min-w-0 p-6">
                  <TabsContent value="cost-codes" className="mt-0">
                    <CostCodesTab
                      costCodes={costCodes}
                      loading={loading}
                      selectedCostCodes={selectedCostCodes}
                      collapsedGroups={collapsedGroups}
                      priceHistoryCounts={priceHistoryCounts}
                      onCostCodeSelect={handleCostCodeSelect}
                      onSelectAllCostCodes={handleSelectAllCostCodes}
                      onToggleGroupCollapse={toggleGroupCollapse}
                      onAddCostCode={handleAddCostCode}
                      onUpdateCostCode={handleUpdateCostCode}
                      onEditCostCode={handleEditClick}
                      onDeleteCostCode={handleDeleteClick}
                      onImportCostCodes={handleImportCostCodes}
                      onBulkDeleteCostCodes={handleBulkDeleteCostCodes}
                      onPriceSync={refetch}
                      isEditing={editingCostCode !== null}
                    />
                  </TabsContent>
                  
                  <TabsContent value="specifications" className="mt-0">
                    <SpecificationsTab
                      specifications={specifications}
                      loading={specificationsLoading}
                      selectedSpecifications={selectedSpecifications}
                      collapsedGroups={collapsedSpecGroups}
                      allCostCodes={costCodes}
                      onSpecificationSelect={handleSpecificationSelect}
                      onSelectAllSpecifications={handleSelectAllSpecifications}
                      onToggleGroupCollapse={toggleSpecificationGroupCollapse}
                      onBulkDeleteSpecifications={() => setBulkDeleteSpecsDialogOpen(true)}
                      onEditDescription={handleEditSpecificationDescription}
                      onUpdateSpecification={handleUpdateSpecification}
                      onDeleteSpecification={handleDeleteSpecificationClick}
                      onFileUpload={handleSpecificationFileUpload}
                      onDeleteIndividualFile={handleDeleteIndividualSpecificationFile}
                    />
                  </TabsContent>

                  <TabsContent value="chart-of-accounts" className="mt-0">
                    <ChartOfAccountsTab />
                  </TabsContent>

                  <TabsContent value="budget" className="mt-0">
                    <BudgetWarningsTab />
                  </TabsContent>

                  <TabsContent value="dashboard" className="mt-0">
                    <DashboardSettingsTab />
                  </TabsContent>

                  <TabsContent value="away-message" className="mt-0">
                    <AwayMessageSettings />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </main>

        <EditCostCodeDialog
          costCode={editingCostCode}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
          onUpdateCostCode={handleUpdateCostCode}
        />

        <EditSpecificationDescriptionDialog
          specification={editingSpecification}
          open={descriptionDialogOpen}
          onOpenChange={setDescriptionDialogOpen}
          onUpdateDescription={handleUpdateSpecificationDescription}
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
              <AlertDialogAction onClick={() => { handleBulkDeleteCostCodes(); setBulkDeleteDialogOpen(false); }} className="bg-red-600 hover:bg-red-700">
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteSpecDialogOpen} onOpenChange={setDeleteSpecDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Specification</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove specifications for "{specToDelete?.cost_code.code} - {specToDelete?.cost_code.name}"? This will disable specifications for this cost code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => specToDelete && handleConfirmDeleteSpecification(specToDelete)} className="bg-red-600 hover:bg-red-700">
                Delete
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
              <AlertDialogAction onClick={() => { handleBulkDeleteSpecifications(); setBulkDeleteSpecsDialogOpen(false); }} className="bg-red-600 hover:bg-red-700">
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
    </UniversalFilePreviewProvider>
  );
};

export default Settings;
