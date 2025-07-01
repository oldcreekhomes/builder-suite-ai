
import React from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { AddCostCodeDialog } from "@/components/AddCostCodeDialog";
import { EditCostCodeDialog } from "@/components/EditCostCodeDialog";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { CostCodeInlineEditor } from "@/components/CostCodeInlineEditor";
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
import { useState, useEffect } from "react";
import { useCostCodes } from "@/hooks/useCostCodes";
import type { Tables } from "@/integrations/supabase/types";

type CostCode = Tables<'cost_codes'>;

const Settings = () => {
  const {
    costCodes,
    loading,
    addCostCode,
    updateCostCode,
    deleteCostCode,
    importCostCodes,
  } = useCostCodes();

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

  // Initialize collapsed state for all parent groups
  useEffect(() => {
    setCollapsedGroups(new Set(Array.from(parentCodesWithChildren)));
  }, [costCodes]);

  // Group cost codes by parent group, excluding parent codes that have children
  const groupedCostCodes = costCodes.reduce((groups, costCode) => {
    const parentGroup = costCode.parent_group;
    
    // If this cost code is a parent with children, don't include it as an individual row
    if (parentCodesWithChildren.has(costCode.code)) {
      return groups;
    }
    
    if (parentGroup) {
      if (!groups[parentGroup]) {
        groups[parentGroup] = [];
      }
      groups[parentGroup].push(costCode);
    } else {
      if (!groups['ungrouped']) {
        groups['ungrouped'] = [];
      }
      groups['ungrouped'].push(costCode);
    }
    return groups;
  }, {} as Record<string, typeof costCodes>);

  // Get parent cost code details for group headers
  const getParentCostCode = (parentGroupCode: string) => {
    return costCodes.find(cc => cc.code === parentGroupCode);
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

  // Specification selection handlers (mock data for now)
  const mockSpecs = [
    { id: '1', name: 'Concrete Mix Design', category: 'Foundation' },
    { id: '2', name: 'Framing Lumber', category: 'Framing' },
    { id: '3', name: 'Insulation', category: 'Insulation' }
  ];

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
      const allIds = new Set(mockSpecs.map(spec => spec.id));
      setSelectedSpecifications(allIds);
    } else {
      setSelectedSpecifications(new Set());
    }
  };

  const handleBulkDeleteSpecifications = () => {
    // This would implement actual bulk delete for specifications
    console.log('Bulk deleting specifications:', selectedSpecifications);
    setSelectedSpecifications(new Set());
    setBulkDeleteSpecsDialogOpen(false);
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
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-black">Cost Codes</h3>
                        {selectedCostCodes.size > 0 && (
                          <p className="text-sm text-gray-600">
                            {selectedCostCodes.size} item{selectedCostCodes.size !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedCostCodes.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBulkDeleteDialogOpen(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedCostCodes.size})
                          </Button>
                        )}
                        <ExcelImportDialog onImportCostCodes={handleImportCostCodes} />
                        <AddCostCodeDialog 
                          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
                          onAddCostCode={handleAddCostCode}
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-10">
                            <TableHead className="font-bold py-2 text-sm w-12">
                              <Checkbox
                                checked={selectedCostCodes.size === costCodes.length && costCodes.length > 0}
                                onCheckedChange={handleSelectAllCostCodes}
                                ref={(el) => {
                                  if (el && 'indeterminate' in el) {
                                    (el as any).indeterminate = selectedCostCodes.size > 0 && selectedCostCodes.size < costCodes.length;
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="font-bold py-2 text-sm">Code</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Description</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Quantity</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Price</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Unit</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Specifications</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Bidding</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
                                Loading cost codes...
                              </TableCell>
                            </TableRow>
                          ) : costCodes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                No cost codes found. Add some or import from Excel.
                              </TableCell>
                            </TableRow>
                          ) : (
                            Object.entries(groupedCostCodes).map(([groupKey, groupCostCodes]) => (
                              <React.Fragment key={groupKey}>
                                {groupKey !== 'ungrouped' && (
                                  <TableRow className="bg-gray-50 h-10">
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <Checkbox
                                          checked={selectedCostCodes.has(getParentCostCode(groupKey)!.id)}
                                          onCheckedChange={(checked) => 
                                            handleCostCodeSelect(getParentCostCode(groupKey)!.id, checked as boolean)
                                          }
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell 
                                      className="font-semibold text-gray-700 cursor-pointer py-1 text-sm"
                                      onClick={() => toggleGroupCollapse(groupKey)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {collapsedGroups.has(groupKey) ? (
                                          <ChevronRight className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                        <span>{groupKey}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-semibold text-gray-700 py-1 text-sm">
                                      {getParentCostCode(groupKey)?.name}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <CostCodeInlineEditor
                                          costCode={getParentCostCode(groupKey)!}
                                          field="quantity"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <CostCodeInlineEditor
                                          costCode={getParentCostCode(groupKey)!}
                                          field="price"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <CostCodeInlineEditor
                                          costCode={getParentCostCode(groupKey)!}
                                          field="unit_of_measure"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <CostCodeInlineEditor
                                          costCode={getParentCostCode(groupKey)!}
                                          field="has_specifications"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <CostCodeInlineEditor
                                          costCode={getParentCostCode(groupKey)!}
                                          field="has_bidding"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1">
                                      {getParentCostCode(groupKey) && (
                                        <div className="flex gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditClick(getParentCostCode(groupKey)!);
                                            }}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClick(getParentCostCode(groupKey)!);
                                            }}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )}
                                {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && 
                                  groupCostCodes.map((costCode) => (
                                    <TableRow key={costCode.id} className="h-8">
                                      <TableCell className="py-1">
                                        <Checkbox
                                          checked={selectedCostCodes.has(costCode.id)}
                                          onCheckedChange={(checked) => 
                                            handleCostCodeSelect(costCode.id, checked as boolean)
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium py-1 text-sm">
                                        {groupKey !== 'ungrouped' && <span className="ml-6"></span>}
                                        {costCode.code}
                                      </TableCell>
                                      <TableCell className="py-1 text-sm">{costCode.name}</TableCell>
                                      <TableCell className="py-1">
                                        <CostCodeInlineEditor
                                          costCode={costCode}
                                          field="quantity"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <CostCodeInlineEditor
                                          costCode={costCode}
                                          field="price"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <CostCodeInlineEditor
                                          costCode={costCode}
                                          field="unit_of_measure"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <CostCodeInlineEditor
                                          costCode={costCode}
                                          field="has_specifications"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <CostCodeInlineEditor
                                          costCode={costCode}
                                          field="has_bidding"
                                          onUpdate={handleUpdateCostCode}
                                        />
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <div className="flex gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => handleEditClick(costCode)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => handleDeleteClick(costCode)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                }
                              </React.Fragment>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="specifications" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-black">Specifications</h3>
                        <p className="text-sm text-gray-600">Manage your project specifications and requirements</p>
                        {selectedSpecifications.size > 0 && (
                          <p className="text-sm text-gray-600">
                            {selectedSpecifications.size} item{selectedSpecifications.size !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedSpecifications.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBulkDeleteSpecsDialogOpen(true)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedSpecifications.size})
                          </Button>
                        )}
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Specification
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-10">
                            <TableHead className="font-bold py-2 text-sm w-12">
                              <Checkbox
                                checked={selectedSpecifications.size === mockSpecs.length && mockSpecs.length > 0}
                                onCheckedChange={handleSelectAllSpecifications}
                                ref={(el) => {
                                  if (el && 'indeterminate' in el) {
                                    (el as any).indeterminate = selectedSpecifications.size > 0 && selectedSpecifications.size < mockSpecs.length;
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="font-bold py-2 text-sm">Specification</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Category</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Description</TableHead>
                            <TableHead className="font-bold py-2 text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="h-8">
                            <TableCell className="py-1">
                              <Checkbox
                                checked={selectedSpecifications.has('1')}
                                onCheckedChange={(checked) => 
                                  handleSpecificationSelect('1', checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium py-1 text-sm">Concrete Mix Design</TableCell>
                            <TableCell className="py-1 text-sm">Foundation</TableCell>
                            <TableCell className="py-1 text-sm">3000 PSI concrete with air entrainment</TableCell>
                            <TableCell className="py-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow className="h-8">
                            <TableCell className="py-1">
                              <Checkbox
                                checked={selectedSpecifications.has('2')}
                                onCheckedChange={(checked) => 
                                  handleSpecificationSelect('2', checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium py-1 text-sm">Framing Lumber</TableCell>
                            <TableCell className="py-1 text-sm">Framing</TableCell>
                            <TableCell className="py-1 text-sm">Grade A Douglas Fir 2x4, 2x6, 2x8</TableCell>
                            <TableCell className="py-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow className="h-8">
                            <TableCell className="py-1">
                              <Checkbox
                                checked={selectedSpecifications.has('3')}
                                onCheckedChange={(checked) => 
                                  handleSpecificationSelect('3', checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium py-1 text-sm">Insulation</TableCell>
                            <TableCell className="py-1 text-sm">Insulation</TableCell>
                            <TableCell className="py-1 text-sm">R-15 fiberglass batt insulation</TableCell>
                            <TableCell className="py-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
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
