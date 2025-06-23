
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { AddCostCodeDialog } from "@/components/AddCostCodeDialog";
import { EditCostCodeDialog } from "@/components/EditCostCodeDialog";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
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
import { useState } from "react";
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

  // Get all parent codes that have children
  const parentCodesWithChildren = new Set(
    costCodes
      .filter(cc => cc.parent_group)
      .map(cc => cc.parent_group)
      .filter(Boolean)
  );

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
                <p className="text-gray-600">Manage your company settings and configurations</p>
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
                      </div>
                      <div className="flex gap-2">
                        <ExcelImportDialog onImportCostCodes={handleImportCostCodes} />
                        <AddCostCodeDialog 
                          existingCostCodes={costCodes.map(cc => ({ code: cc.code, name: cc.name }))}
                          onAddCostCode={handleAddCostCode}
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Specifications</TableHead>
                            <TableHead>Bidding</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                Loading cost codes...
                              </TableCell>
                            </TableRow>
                          ) : costCodes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                No cost codes found. Add some or import from Excel.
                              </TableCell>
                            </TableRow>
                          ) : (
                            Object.entries(groupedCostCodes).map(([groupKey, groupCostCodes]) => (
                              <>
                                {groupKey !== 'ungrouped' && (
                                  <TableRow key={`group-${groupKey}`} className="bg-gray-50 hover:bg-gray-100">
                                    <TableCell 
                                      colSpan={8} 
                                      className="font-semibold text-gray-700 cursor-pointer"
                                      onClick={() => toggleGroupCollapse(groupKey)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {collapsedGroups.has(groupKey) ? (
                                          <ChevronRight className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                        <span>{groupKey}</span>
                                        {getParentCostCode(groupKey) && (
                                          <span className="text-gray-600 font-normal">
                                            - {getParentCostCode(groupKey)?.name}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {(groupKey === 'ungrouped' || !collapsedGroups.has(groupKey)) && 
                                  groupCostCodes.map((costCode) => (
                                    <TableRow key={costCode.id} className={groupKey !== 'ungrouped' ? 'bg-gray-25' : ''}>
                                      <TableCell className="font-medium">
                                        {groupKey !== 'ungrouped' && <span className="ml-6"></span>}
                                        {costCode.code}
                                      </TableCell>
                                      <TableCell>{costCode.name}</TableCell>
                                      <TableCell>{costCode.quantity || "-"}</TableCell>
                                      <TableCell>{costCode.price ? `$${costCode.price.toFixed(2)}` : "-"}</TableCell>
                                      <TableCell>{costCode.unit_of_measure || "-"}</TableCell>
                                      <TableCell>{costCode.has_specifications ? "Yes" : "No"}</TableCell>
                                      <TableCell>{costCode.has_bidding ? "Yes" : "No"}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-2">
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
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                }
                              </>
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
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Specification
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Specification</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Concrete Mix Design</TableCell>
                            <TableCell>Foundation</TableCell>
                            <TableCell>3000 PSI concrete with air entrainment</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Framing Lumber</TableCell>
                            <TableCell>Framing</TableCell>
                            <TableCell>Grade A Douglas Fir 2x4, 2x6, 2x8</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Insulation</TableCell>
                            <TableCell>Insulation</TableCell>
                            <TableCell>R-15 fiberglass batt insulation</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">Edit</Button>
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
      </div>
    </SidebarProvider>
  );
};

export default Settings;
