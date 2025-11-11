import { useState } from "react";
import type { CostCode } from "@/types/settings";

export const useCostCodeHandlers = (
  costCodes: CostCode[],
  addCostCode: (newCostCode: any) => Promise<void>,
  updateCostCode: (costCodeId: string, updatedCostCode: any) => Promise<void>,
  deleteCostCode: (costCodeId: string) => Promise<void>,
  importCostCodes: (importedCostCodes: any[]) => Promise<void>
) => {
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    // Initialize with all codes that have subcategories OR are referenced as parents
    const initialCollapsed = new Set<string>();
    const referencedAsParent = new Set<string>();
    
    // Find all codes referenced as parent_group
    costCodes.forEach(cc => {
      if (cc.parent_group) {
        referencedAsParent.add(cc.parent_group);
      }
    });
    
    // Add codes that have subcategories OR are referenced as parents
    costCodes.forEach(cc => {
      if (cc.has_subcategories || referencedAsParent.has(cc.code)) {
        initialCollapsed.add(cc.code);
      }
    });
    
    return initialCollapsed;
  });

  const handleAddCostCode = async (newCostCode: any) => {
    console.log("Adding new cost code:", newCostCode);
    await addCostCode(newCostCode);
  };

  const handleUpdateCostCode = async (costCodeId: string, updatedCostCode: any) => {
    console.log("Updating cost code:", costCodeId, updatedCostCode);
    await updateCostCode(costCodeId, updatedCostCode);
  };

  const handleImportCostCodes = async (importedCostCodes: any[]) => {
    console.log("Importing cost codes:", importedCostCodes);
    await importCostCodes(importedCostCodes);
  };

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
  };

  const toggleGroupCollapse = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  return {
    selectedCostCodes,
    collapsedGroups,
    handleAddCostCode,
    handleUpdateCostCode,
    handleImportCostCodes,
    handleCostCodeSelect,
    handleSelectAllCostCodes,
    handleBulkDeleteCostCodes,
    toggleGroupCollapse,
  };
};