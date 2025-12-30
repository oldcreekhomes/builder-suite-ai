import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatUnitOfMeasure } from "@/utils/budgetUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Sparkles, Loader2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AIExtractReviewDialog } from "./AIExtractReviewDialog";
import { AddTakeoffItemDialog } from "./AddTakeoffItemDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/settings/BulkActionBar";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useTakeoffItemSelection } from "@/hooks/useTakeoffItemSelection";
import { useTakeoffItemMutations } from "@/hooks/useTakeoffItemMutations";
import { InlineEditCell } from "@/components/schedule/InlineEditCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TakeoffTableProps {
  sheetId: string | null;
  takeoffId: string;
  selectedReviewItem: { id: string; color: string; category: string } | null;
  onSelectReviewItem: (item: { id: string; color: string; category: string } | null) => void;
  visibleAnnotations: Set<string>;
  onToggleVisibility: (itemId: string) => void;
  onItemsAdded?: (itemIds: string[]) => void;
}

export function TakeoffTable({ sheetId, takeoffId, selectedReviewItem, onSelectReviewItem, visibleAnnotations, onToggleVisibility, onItemsAdded }: TakeoffTableProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();
  const { selectedItems, handleItemCheckboxChange, clearSelection, selectAll } = useTakeoffItemSelection();
  const { handleDeleteItems, isDeleting, handleUpdateQuantity } = useTakeoffItemMutations(sheetId || '');

  // Toggle group expand/collapse
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Color update mutation
  const updateColorMutation = useMutation({
    mutationFn: async ({ itemId, color }: { itemId: string; color: string }) => {
      const { error } = await supabase
        .from('takeoff_items')
        .update({ color })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update color",
        variant: "destructive",
      });
    },
  });

  const handleColorChange = (itemId: string, color: string) => {
    updateColorMutation.mutate({ itemId, color });
  };

  const handleBulkDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    const itemsToDelete = Array.from(selectedItems);
    
    if (itemsToDelete.length > 0) {
      handleDeleteItems(itemsToDelete);
      clearSelection();
    }
    setShowDeleteDialog(false);
  };

  // Select all / deselect all logic
  const handleSelectAll = (checked: boolean) => {
    if (!items) return;
    
    if (checked) {
      const itemIds = items.map((item: any) => item.id);
      selectAll(itemIds);
    } else {
      clearSelection();
    }
  };

  const handleAIExtract = async () => {
    if (!sheetId) {
      toast({
        title: "No sheet selected",
        description: "Please select a sheet first.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-takeoff', {
        body: { sheet_id: sheetId }
      });
      
      if (error) throw error;

      // Handle explicit auth/permission errors from edge function
      if (data && !data.success && data.error_code) {
        toast({
          title: "Extraction Failed",
          description: data.error || "Authentication or permission issue with Roboflow.",
          variant: "destructive",
        });
        setIsExtracting(false);
        return;
      }

      if (!data.success || !data.items || data.items.length === 0) {
        toast({
          title: "No items found",
          description: "AI couldn't find any items to extract from this drawing.",
          variant: "default",
        });
        return;
      }

      // Transform items to match dialog expectations
      const transformedData = {
        ...data,
        items: data.items.map((item: any) => {
          // Extract confidence percentage from notes
          const confidenceMatch = item.notes?.match(/(\d+)% avg confidence/);
          const confidencePercent = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
          
          // Map percentage to high/medium/low
          let confidence: 'high' | 'medium' | 'low' = 'low';
          if (confidencePercent >= 80) confidence = 'high';
          else if (confidencePercent >= 60) confidence = 'medium';
          
          return {
            ...item,
            cost_code_name: item.category,  // Map category to cost_code_name
            confidence: confidence  // Add confidence field
          };
        })
      };

      setExtractedData(transformedData);
      setShowReviewDialog(true);
    } catch (error) {
      console.error('AI extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Failed to extract quantities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const { data: items, refetch } = useQuery({
    queryKey: ['takeoff-items', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      
      // Get current user's owner_id for RLS
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return [];
      
      // Get owner_id (home_builder_id for employees, or user's own id)
      const { data: userProfile } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', userId)
        .single();
      
      const ownerId = userProfile?.role === 'owner' ? userId : userProfile?.home_builder_id;
      if (!ownerId) return [];
      
      // Fetch existing takeoff items with cost code info for grouping
      const { data: existingItems, error: itemsError } = await supabase
        .from('takeoff_items')
        .select('*, cost_code_id, color, cost_codes(code, name, parent_group)')
        .eq('takeoff_sheet_id', sheetId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch estimate-enabled cost codes (leaf items only - no parent categories)
      const { data: estimateCostCodes, error: costCodesError } = await supabase
        .from('cost_codes')
        .select('id, code, name, unit_of_measure, price, category, parent_group')
        .eq('owner_id', ownerId)
        .eq('estimate', true)
        .eq('has_subcategories', false)
        .order('code', { ascending: true });

      if (costCodesError) throw costCodesError;

      // Find cost codes that don't have takeoff items yet
      const existingCostCodeIds = new Set(existingItems?.map(item => item.cost_code_id) || []);
      const missingCostCodes = estimateCostCodes?.filter(cc => !existingCostCodeIds.has(cc.id)) || [];

      // Auto-create takeoff items for missing cost codes
      if (missingCostCodes.length > 0) {
        const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        const existingCount = existingItems?.length || 0;
        
        const newItems = missingCostCodes.map((costCode, index) => ({
          takeoff_sheet_id: sheetId,
          cost_code_id: costCode.id,
          category: costCode.name,
          item_type: 'auto',
          quantity: 0,
          unit_of_measure: costCode.unit_of_measure || 'EA',
          unit_price: costCode.price || 0,
          color: colors[(existingCount + index) % colors.length],
          owner_id: ownerId,
        }));

        const { data: insertedItems, error: insertError } = await supabase
          .from('takeoff_items')
          .insert(newItems)
          .select('*, cost_code_id, color, cost_codes(code, name, parent_group)');

        if (insertError) {
          console.error('Error auto-creating takeoff items:', insertError);
        } else if (insertedItems) {
          // Combine existing and newly inserted items
          return [...(existingItems || []), ...insertedItems];
        }
      }

      return existingItems || [];
    },
    enabled: !!sheetId,
  });

  // Fetch parent cost codes for group names
  const { data: parentCostCodes } = useQuery({
    queryKey: ['parent-cost-codes'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return [];
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('home_builder_id, role')
        .eq('id', userId)
        .single();
      
      const ownerId = userProfile?.role === 'owner' ? userId : userProfile?.home_builder_id;
      if (!ownerId) return [];
      
      const { data } = await supabase
        .from('cost_codes')
        .select('code, name')
        .eq('owner_id', ownerId)
        .eq('has_subcategories', true)
        .order('code');
      
      return data || [];
    },
  });

  // Group items by parent_group
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) return {};
    
    const groups: Record<string, any[]> = {};
    
    items.forEach((item: any) => {
      const parentGroup = item.cost_codes?.parent_group || 'Ungrouped';
      if (!groups[parentGroup]) {
        groups[parentGroup] = [];
      }
      groups[parentGroup].push(item);
    });
    
    // Sort groups by parent code
    const sortedGroups: Record<string, any[]> = {};
    Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach(key => {
        sortedGroups[key] = groups[key];
      });
    
    return sortedGroups;
  }, [items]);

  // Get parent name for a group code
  const getParentName = (parentCode: string) => {
    if (parentCode === 'Ungrouped') return 'Other Items';
    const parent = parentCostCodes?.find((cc: any) => cc.code === parentCode);
    return parent ? `${parentCode} - ${parent.name}` : parentCode;
  };

  // Calculate group totals
  const getGroupTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  const getGroupDollarTotal = (groupItems: any[]) => {
    return groupItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  };

  // Calculate select all checkbox state
  const allSelected = items && items.length > 0 && items.every((item: any) => selectedItems.has(item.id));
  const someSelected = items && items.some((item: any) => selectedItems.has(item.id)) && !allSelected;

  // Handle new item added - auto-select it for drawing
  const handleItemAdded = (itemId: string) => {
    // Refetch items and then select the new one
    refetch().then(() => {
      // Find the newly added item to get its details
      const findAndSelect = () => {
        const newItem = items?.find((item: any) => item.id === itemId);
        if (newItem) {
          onSelectReviewItem({
            id: newItem.id,
            color: newItem.color || '#3b82f6',
            category: newItem.category
          });
        }
      };
      
      // Small delay to ensure refetch completed
      setTimeout(findAndSelect, 100);
    });
    
    // Also notify parent for visibility
    if (onItemsAdded) {
      onItemsAdded([itemId]);
    }
  };

  if (!sheetId) {
    return (
      <div className="flex items-center justify-center h-full border-l">
        <p className="text-muted-foreground">Select a sheet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l">
      <div className="px-4 py-3 min-h-16 border-b flex items-center">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-medium">Takeoff Items</h3>
          <div className="flex gap-2 items-center">
            <BulkActionBar
              selectedCount={selectedItems.size}
              onBulkDelete={handleBulkDelete}
              label="Items"
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="h-10"
              onClick={handleAIExtract}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-extracting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Re-extract
                </>
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-10"
              onClick={() => setShowAddItemDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  {...(someSelected ? { "data-state": "indeterminate" } : {})}
                />
              </TableHead>
              <TableHead className="w-16"></TableHead>
              <TableHead className="w-20">Color</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!items || items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No items measured yet
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedItems).map(([parentCode, groupItems]) => {
                const isExpanded = expandedGroups.has(parentCode);
                const groupTotal = getGroupTotal(groupItems);
                const groupDollarTotal = getGroupDollarTotal(groupItems);
                const firstItem = groupItems[0];
                const groupUnit = firstItem?.unit_of_measure || 'EA';
                
                return (
                  <> 
                    {/* Group Header Row */}
                    <TableRow 
                      key={`group-${parentCode}`}
                      className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                      onClick={() => toggleGroup(parentCode)}
                    >
                      <TableCell className="w-12">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="font-semibold" colSpan={1}>
                        {getParentName(parentCode)}
                      </TableCell>
                      <TableCell className="font-semibold">{groupTotal}</TableCell>
                      <TableCell className="font-semibold">{formatUnitOfMeasure(groupUnit)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="font-semibold">
                        {groupDollarTotal > 0 ? `$${groupDollarTotal.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                    
                    {/* Child Rows */}
                    {isExpanded && groupItems.map((item: any) => {
                      const isSelected = selectedReviewItem?.id === item.id;
                      
                      return (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "pl-8",
                            isSelected && 'bg-primary/10 ring-2 ring-primary'
                          )}
                          onClick={() => onSelectReviewItem({
                            id: item.id,
                            color: item.color || '#3b82f6',
                            category: item.category
                          })}
                          style={{ cursor: 'pointer' }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={(checked) => handleItemCheckboxChange(item.id, !!checked)}
                              className="ml-4"
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {isSelected && (
                              <div className="flex items-center justify-center">
                                <div className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                                  DRAW
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <label 
                                htmlFor={`color-${item.id}`}
                                className="cursor-pointer"
                              >
                                <div 
                                  className="w-6 h-6 rounded border-2 border-border"
                                  style={{ backgroundColor: item.color || '#3b82f6' }}
                                />
                              </label>
                              <Input
                                type="color"
                                value={item.color || '#3b82f6'}
                                onChange={(e) => handleColorChange(item.id, e.target.value)}
                                className="w-0 h-0 opacity-0 absolute"
                                id={`color-${item.id}`}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleVisibility(item.id);
                                }}
                                className="cursor-pointer hover:opacity-80"
                                aria-label={`Toggle visibility for ${item.category}`}
                              >
                                {visibleAnnotations.has(item.id) ? (
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium pl-4">{item.category}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <InlineEditCell
                              value={item.quantity}
                              type="number"
                              onSave={(newValue) => {
                                const qty = Number(newValue);
                                if (qty >= 0 && !isNaN(qty)) {
                                  handleUpdateQuantity(item.id, qty);
                                }
                              }}
                              className="text-left"
                            />
                          </TableCell>
                          <TableCell>{formatUnitOfMeasure(item.unit_of_measure)}</TableCell>
                          <TableCell>
                            {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {item.total_cost ? `$${Number(item.total_cost).toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {extractedData && (
        <AIExtractReviewDialog
          open={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
            setExtractedData(null);
          }}
          items={extractedData.items}
          sheetId={sheetId}
          onSaveComplete={(newItemIds) => {
            refetch();
            
            // Invalidate all related queries to update overlays and visibility
            queryClient.invalidateQueries({ queryKey: ['takeoff-annotations'] });
            queryClient.invalidateQueries({ queryKey: ['takeoff-items-visibility'] });
            
            // Immediately make the new items visible
            if (onItemsAdded && newItemIds.length > 0) {
              onItemsAdded(newItemIds);
            }
            
            toast({
              title: "Items saved",
              description: "Takeoff items have been added successfully.",
            });
          }}
        />
      )}

      <AddTakeoffItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        sheetId={sheetId}
        takeoffId={takeoffId}
        onItemAdded={handleItemAdded}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Takeoff Items"
        description={`Are you sure you want to delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
