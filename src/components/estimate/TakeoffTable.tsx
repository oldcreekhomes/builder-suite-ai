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
      
      const { data, error } = await supabase
        .from('takeoff_items')
        .select('*')
        .eq('takeoff_sheet_id', sheetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
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
