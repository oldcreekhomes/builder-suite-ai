import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatUnitOfMeasure } from "@/utils/budgetUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Sparkles, Loader2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AIExtractReviewDialog } from "./AIExtractReviewDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/settings/BulkActionBar";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useTakeoffItemSelection } from "@/hooks/useTakeoffItemSelection";
import { useTakeoffItemMutations } from "@/hooks/useTakeoffItemMutations";
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
}

export function TakeoffTable({ sheetId, takeoffId, selectedReviewItem, onSelectReviewItem }: TakeoffTableProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { selectedItems, handleItemCheckboxChange, clearSelection } = useTakeoffItemSelection();
  const { handleDeleteItems, isDeleting } = useTakeoffItemMutations(sheetId || '');

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
    // Filter out template items (only delete actual DB items)
    const itemsToDelete = Array.from(selectedItems).filter(id => !id.startsWith('template-'));
    
    if (itemsToDelete.length > 0) {
      handleDeleteItems(itemsToDelete);
      clearSelection();
    }
    setShowDeleteDialog(false);
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

      if (!data.success || !data.items || data.items.length === 0) {
        toast({
          title: "No items found",
          description: "AI couldn't find any items to extract from this drawing.",
          variant: "default",
        });
        return;
      }

      setExtractedData(data);
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
      
      // Get current user to fetch their estimate cost codes
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Determine correct owner_id (handle employees)
      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      if (!ownerId) return [];

      // Fetch existing takeoff items
      const { data: existingItems, error: itemsError } = await supabase
        .from('takeoff_items')
        .select('*, cost_code_id, color')
        .eq('takeoff_sheet_id', sheetId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch estimate-enabled leaf codes (treat NULL as leaf)
      const { data: estimateLeafCodes, error: leafErr } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('estimate', true)
        .or('has_subcategories.is.null,has_subcategories.eq.false')
        .order('code', { ascending: true });

      if (leafErr) throw leafErr;

      // Fetch parent categories with estimate=true and has_subcategories=true
      const { data: estimateParents, error: parentsErr } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('estimate', true)
        .eq('has_subcategories', true);

      if (parentsErr) throw parentsErr;

      // Build a parent map (code -> name) for display
      const parentMap = new Map<string, string>();
      (estimateParents || []).forEach(parent => {
        parentMap.set(parent.code, parent.name);
      });

      // Fetch children of estimate-enabled parents (regardless of children's estimate flag)
      let parentChildren: any[] = [];
      if (estimateParents && estimateParents.length > 0) {
        const parentCodes = estimateParents.map(p => p.code);
        const { data: subCodes, error: subErr } = await supabase
          .from('cost_codes')
          .select('*')
          .eq('owner_id', ownerId)
          .in('parent_group', parentCodes)
          .order('code', { ascending: true });

        if (subErr) throw subErr;
        parentChildren = subCodes || [];
      }

      // Combine and deduplicate all relevant cost codes
      const allCostCodesMap = new Map();
      [...(estimateLeafCodes || []), ...parentChildren].forEach(code => {
        allCostCodesMap.set(code.id, code);
      });
      const allRelevantCostCodes = Array.from(allCostCodesMap.values());

      // Create a Set of cost_code_ids that already have takeoff items
      const existingCostCodeIds = new Set(
        existingItems?.map(item => item.cost_code_id).filter(Boolean) || []
      );

      // Create template rows for estimate cost codes that don't have items yet
      const templateRows = allRelevantCostCodes
        .filter(code => !existingCostCodeIds.has(code.id))
        .map(code => {
          return {
            id: `template-${code.id}`,
            takeoff_sheet_id: sheetId,
            cost_code_id: code.id,
            category: code.name,
            quantity: 0,
            unit_of_measure: code.unit_of_measure,
            unit_price: code.price || 0,
            total_cost: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            isTemplate: true, // Flag to identify template rows
          };
        });

      // Combine existing items with template rows
      return [...(existingItems || []), ...templateRows];
    },
    enabled: !!sheetId,
  });

  if (!sheetId) {
    return (
      <div className="flex items-center justify-center h-full border-l">
        <p className="text-muted-foreground">Select a sheet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
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
              onClick={handleAIExtract}
              disabled={isExtracting}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Extract
                </>
              )}
            </Button>
            <Button size="sm" variant="outline">
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
              <TableHead className="w-12"></TableHead>
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
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No items measured yet
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => {
                const isTemplate = item.isTemplate;
                const isSelectable = !isTemplate;
                const isSelected = selectedReviewItem?.id === item.id;
                
                return (
                  <TableRow 
                    key={item.id} 
                    className={cn(
                      item.isTemplate ? 'opacity-70' : '',
                      isSelected && 'bg-accent'
                    )}
                    onClick={() => !isTemplate && onSelectReviewItem({
                      id: item.id,
                      color: item.color || '#3b82f6',
                      category: item.category
                    })}
                    style={{ cursor: !isTemplate ? 'pointer' : 'default' }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {isSelectable && (
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleItemCheckboxChange(item.id, !!checked)}
                        />
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!isTemplate && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border-2 border-border cursor-pointer"
                            style={{ backgroundColor: item.color || '#3b82f6' }}
                          />
                          <Input
                            type="color"
                            value={item.color || '#3b82f6'}
                            onChange={(e) => handleColorChange(item.id, e.target.value)}
                            className="w-0 h-0 opacity-0 absolute"
                            id={`color-${item.id}`}
                          />
                          <label 
                            htmlFor={`color-${item.id}`}
                            className="cursor-pointer"
                          >
                            <Palette className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </label>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatUnitOfMeasure(item.unit_of_measure)}</TableCell>
                    <TableCell>
                      {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.total_cost ? `$${Number(item.total_cost).toFixed(2)}` : '-'}
                    </TableCell>
                  </TableRow>
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
          onSaveComplete={() => {
            refetch();
            toast({
              title: "Items saved",
              description: "Takeoff items have been added successfully.",
            });
          }}
        />
      )}

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
