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

      const allRelevantCostCodes = estimateLeafCodes || [];

      // Create a Set of cost_code_ids that already have takeoff items
      const existingCostCodeIds = new Set(
        existingItems?.map(item => item.cost_code_id).filter(Boolean) || []
      );

      // Create template rows for estimate cost codes that don't have items yet
      const templateRows = allRelevantCostCodes
        .filter(code => !existingCostCodeIds.has(code.id))
        .map(code => ({
          id: `template-${code.id}`,
          takeoff_sheet_id: sheetId,
          cost_code_id: code.id,
          category: code.category || code.name,
          quantity: 0,
          unit_of_measure: code.unit_of_measure,
          unit_price: code.price || 0,
          total_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isTemplate: true, // Flag to identify template rows
        }));

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
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit_of_measure || '-'}</TableCell>
                  <TableCell>
                    {item.unit_price ? `$${item.unit_price.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {item.total_cost ? `$${item.total_cost.toFixed(2)}` : '-'}
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
