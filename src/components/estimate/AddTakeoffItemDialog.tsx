import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddTakeoffItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  takeoffId: string;
  onItemAdded?: (itemId: string) => void;
}

export function AddTakeoffItemDialog({
  open,
  onOpenChange,
  sheetId,
  takeoffId,
  onItemAdded,
}: AddTakeoffItemDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCostCode, setSelectedCostCode] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch estimate-enabled cost codes
  const { data: costCodes, isLoading } = useQuery({
    queryKey: ['estimate-cost-codes-for-dialog'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      if (!ownerId) return [];

      // Fetch estimate-enabled leaf codes
      const { data: leafCodes, error: leafErr } = await supabase
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

      // Fetch children of estimate-enabled parents
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

      // Combine and deduplicate
      const allCodesMap = new Map();
      [...(leafCodes || []), ...parentChildren].forEach(code => {
        allCodesMap.set(code.id, code);
      });

      return Array.from(allCodesMap.values());
    },
    enabled: open,
  });

  // Filter cost codes based on search
  const filteredCostCodes = useMemo(() => {
    if (!costCodes) return [];
    if (!searchQuery.trim()) return costCodes;

    const query = searchQuery.toLowerCase();
    return costCodes.filter((code: any) =>
      code.name.toLowerCase().includes(query) ||
      code.code.toLowerCase().includes(query)
    );
  }, [costCodes, searchQuery]);

  // Create takeoff item mutation
  const createItemMutation = useMutation({
    mutationFn: async (costCode: any) => {
      // Get current user for owner_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userInfo } = await supabase.rpc('get_current_user_home_builder_info');
      const ownerId = userInfo?.[0]?.is_employee ? userInfo[0].home_builder_id : user.id;

      const { data, error } = await supabase
        .from('takeoff_items')
        .insert({
          takeoff_sheet_id: sheetId,
          cost_code_id: costCode.id,
          category: costCode.name,
          item_type: 'manual',
          owner_id: ownerId,
          quantity: 0,
          unit_of_measure: costCode.unit_of_measure,
          unit_price: costCode.price || 0,
          total_cost: 0,
          color: '#3b82f6', // Default blue color
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', sheetId] });
      toast({
        title: "Item added",
        description: `${data.category} has been added to the takeoff.`,
      });
      onOpenChange(false);
      setSearchQuery("");
      setSelectedCostCode(null);
      
      if (onItemAdded) {
        onItemAdded(data.id);
      }
    },
    onError: (error) => {
      console.error('Failed to create takeoff item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!selectedCostCode) return;
    createItemMutation.mutate(selectedCostCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Takeoff Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cost codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCostCodes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchQuery ? "No matching cost codes" : "No estimate cost codes found"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredCostCodes.map((code: any) => (
                  <button
                    key={code.id}
                    onClick={() => setSelectedCostCode(code)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md transition-colors",
                      "hover:bg-accent",
                      selectedCostCode?.id === code.id && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground mr-2">{code.code}</span>
                        <span className="font-medium">{code.name}</span>
                      </div>
                      {code.unit_of_measure && (
                        <span className="text-xs text-muted-foreground">
                          {code.unit_of_measure}
                        </span>
                      )}
                    </div>
                    {code.price && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ${Number(code.price).toFixed(2)} per {code.unit_of_measure || 'unit'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!selectedCostCode || createItemMutation.isPending}
            >
              {createItemMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
