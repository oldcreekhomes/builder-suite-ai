
import React from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useCostCodes } from "@/hooks/useCostCodes";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useCostCodeHandlers } from "@/hooks/useCostCodeHandlers";
import { useSettingsDialogs } from "@/hooks/useSettingsDialogs";
import type { CostCode, SpecificationWithCostCode } from "@/types/settings";

const Settings = () => {
  const {
    costCodes,
    loading,
    addCostCode,
    updateCostCode,
    deleteCostCode,
    importCostCodes,
  } = useCostCodes();

  // Specifications state and handlers
  const {
    specifications,
    specificationsLoading,
    selectedSpecifications,
    collapsedSpecGroups,
    handleUpdateSpecificationDescription,
    handleSpecificationFileUpload,
    handleDeleteAllSpecificationFiles,
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
                    onBulkDeleteCostCodes={handleBulkDeleteCostCodes}
                  />
                </TabsContent>
                
                <TabsContent value="specifications" className="mt-6">
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
                    onDeleteAllFiles={handleDeleteAllSpecificationFiles}
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
  );
};

export default Settings;
