import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
}

export function TakeoffTable({ sheetId, takeoffId }: TakeoffTableProps) {
  const { data: items } = useQuery({
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
        .select('*, cost_code_id')
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
          // Use parent name if parent_group exists in parentMap, else use category or name
          let displayCategory = code.name;
          if (code.parent_group && parentMap.has(code.parent_group)) {
            displayCategory = parentMap.get(code.parent_group) || code.name;
          } else if (code.category && !/^\d+$/.test(code.category)) {
            displayCategory = code.category;
          }

          return {
            id: `template-${code.id}`,
            takeoff_sheet_id: sheetId,
            cost_code_id: code.id,
            category: displayCategory,
            item_name: code.name, // Keep the specific item name
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
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No items measured yet
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <TableRow key={item.id} className={item.isTemplate ? 'opacity-70' : ''}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{item.category}</span>
                      {item.item_name && item.item_name !== item.category && (
                        <span className="text-xs text-muted-foreground">{item.item_name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit_of_measure || '-'}</TableCell>
                  <TableCell>
                    {item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {item.total_cost ? `$${Number(item.total_cost).toFixed(2)}` : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
