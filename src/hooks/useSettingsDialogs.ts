import { useState } from "react";
import type { CostCode, SpecificationWithCostCode } from "@/types/settings";

export const useSettingsDialogs = () => {
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [editingSpecification, setEditingSpecification] = useState<SpecificationWithCostCode | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSpecDialogOpen, setDeleteSpecDialogOpen] = useState(false);
  const [costCodeToDelete, setCostCodeToDelete] = useState<CostCode | null>(null);
  const [specToDelete, setSpecToDelete] = useState<SpecificationWithCostCode | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteSpecsDialogOpen, setBulkDeleteSpecsDialogOpen] = useState(false);

  const handleEditClick = (costCode: CostCode) => {
    setEditingCostCode(costCode);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (costCode: CostCode) => {
    setCostCodeToDelete(costCode);
    setDeleteDialogOpen(true);
  };

  const handleEditSpecificationDescription = (spec: SpecificationWithCostCode) => {
    setEditingSpecification(spec);
    setDescriptionDialogOpen(true);
  };

  const handleDeleteSpecificationClick = (spec: SpecificationWithCostCode) => {
    setSpecToDelete(spec);
    setDeleteSpecDialogOpen(true);
  };

  return {
    // State
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

    // Setters
    setEditDialogOpen,
    setDescriptionDialogOpen,
    setDeleteDialogOpen,
    setDeleteSpecDialogOpen,
    setCostCodeToDelete,
    setSpecToDelete,
    setBulkDeleteDialogOpen,
    setBulkDeleteSpecsDialogOpen,

    // Handlers
    handleEditClick,
    handleDeleteClick,
    handleEditSpecificationDescription,
    handleDeleteSpecificationClick,
  };
};