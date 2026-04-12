import React, { useState } from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Settings as SettingsIcon } from "lucide-react";
import { ContentSidebar, type ContentSidebarGroup } from "@/components/ui/ContentSidebar";
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
import { CompanyProfileTab } from "@/components/settings/CompanyProfileTab";
import { EmployeesTab } from "@/components/settings/EmployeesTab";
import { CompaniesTab } from "@/components/settings/CompaniesTab";
import { RepresentativesTab } from "@/components/settings/RepresentativesTab";
import { MyProfileTab } from "@/components/settings/MyProfileTab";
import { SubscriptionTab } from "@/components/settings/SubscriptionTab";

import { useCostCodes } from "@/hooks/useCostCodes";
import { useSpecifications } from "@/hooks/useSpecifications";
import { useCostCodeHandlers } from "@/hooks/useCostCodeHandlers";
import { useSettingsDialogs } from "@/hooks/useSettingsDialogs";
import type { CostCode, SpecificationWithCostCode } from "@/types/settings";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || "company-profile";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [openGroups, setOpenGroups] = useState<string[]>(
    defaultTab === "companies" || defaultTab === "representatives" ? ["Suppliers"] : []
  );
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
        <div className="min-h-screen flex w-full bg-muted/30">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <DashboardHeader />
            <div className="flex flex-1 overflow-hidden">
              <ContentSidebar
                title="Settings"
                icon={SettingsIcon}
                items={[
                  { value: "budget", label: "Budget" },
                  { value: "chart-of-accounts", label: "Chart of Accounts" },
                  { value: "company-profile", label: "Company Profile" },
                  { value: "cost-codes", label: "Cost Codes" },
                  { value: "dashboard", label: "Dashboards" },
                  { value: "my-profile", label: "My Profile" },
                  { value: "employees", label: "Employees" },
                  { value: "specifications", label: "Specifications" },
                  {
                    label: "Suppliers",
                    collapsible: true,
                    items: [
                      { value: "companies", label: "Companies" },
                      { value: "representatives", label: "Representatives" },
                    ],
                  } as ContentSidebarGroup,
                ]}
                activeItem={activeTab}
                onItemChange={setActiveTab}
                openGroups={openGroups}
                onGroupToggle={(label) =>
                  setOpenGroups((prev) =>
                    prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
                  )
                }
              />

              <div className="flex-1 min-w-0 p-6 overflow-auto">
                {activeTab === "company-profile" && <CompanyProfileTab />}
                {activeTab === "employees" && <EmployeesTab />}
                {activeTab === "companies" && <CompaniesTab />}
                {activeTab === "representatives" && <RepresentativesTab />}
                {activeTab === "cost-codes" && (
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
                      onRefetch={refetch}
                    />
                )}
                {activeTab === "specifications" && (
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
                )}
                {activeTab === "chart-of-accounts" && <ChartOfAccountsTab />}
                {activeTab === "budget" && <BudgetWarningsTab />}
                {activeTab === "dashboard" && <DashboardSettingsTab />}
                {activeTab === "my-profile" && <MyProfileTab />}
              </div>
            </div>
          </main>

        <EditCostCodeDialog
          costCode={editingCostCode}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
          onUpdateCostCode={handleUpdateCostCode}
          onPriceUpdate={refetch}
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
