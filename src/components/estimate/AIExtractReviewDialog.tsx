import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUnitOfMeasure } from "@/utils/budgetUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ExtractedItem {
  cost_code_id: string;
  cost_code_name: string;
  quantity: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  unit_of_measure: string;
  unit_price: number;
}

interface AIExtractReviewDialogProps {
  open: boolean;
  onClose: () => void;
  items: ExtractedItem[];
  sheetId: string;
  onSaveComplete: () => void;
}

export function AIExtractReviewDialog({ 
  open, 
  onClose, 
  items: initialItems, 
  sheetId,
  onSaveComplete 
}: AIExtractReviewDialogProps) {
  const [items, setItems] = useState(
    initialItems.map(item => ({ ...item, included: item.quantity > 0 }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleQuantityChange = (index: number, newQuantity: string) => {
    const quantity = parseFloat(newQuantity) || 0;
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const handleIncludeToggle = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, included: !item.included } : item
    ));
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleSave = async () => {
    const itemsToUpdate = items
      .filter(item => item.included && item.quantity > 0)
      .map(item => {
        const unit = item.unit_of_measure?.toLowerCase() || '';
        let itemType = 'count';
        if (unit.includes('linear') || unit === 'lf') itemType = 'length';
        else if (unit.includes('square') || unit === 'sf') itemType = 'area';
        else if (unit.includes('cubic') || unit === 'cf') itemType = 'volume';

        return {
          cost_code_id: item.cost_code_id,
          cost_code_name: item.cost_code_name,
          item_type: itemType,
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure,
          unit_price: item.unit_price,
          notes: item.notes,
        };
      });

    if (itemsToUpdate.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to save.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update existing takeoff items created by AI for this sheet by matching on category/name
      const results = await Promise.all(itemsToUpdate.map(async (u) => {
        const { error } = await supabase
          .from('takeoff_items')
          .update({
            quantity: u.quantity,
            unit_of_measure: u.unit_of_measure,
            unit_price: u.unit_price,
            notes: u.notes,
          })
          .eq('takeoff_sheet_id', sheetId)
          .eq('cost_code_id', u.cost_code_id)
          .eq('item_type', u.item_type);
        return { ok: !error, error };
      }));

      const successCount = results.filter(r => r.ok).length;

      toast({
        title: "Updated",
        description: `Updated ${successCount} item${successCount !== 1 ? 's' : ''}.`,
      });

      onSaveComplete();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to update items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = items.filter(item => item.included && item.quantity > 0).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review AI Extracted Quantities</DialogTitle>
          <DialogDescription>
            AI found {items.length} items. Review and adjust quantities before saving.
            {selectedCount > 0 && ` (${selectedCount} selected)`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Include</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-[100px]">Quantity</TableHead>
                <TableHead className="w-[80px]">Unit</TableHead>
                <TableHead className="w-[100px]">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.cost_code_id}>
                  <TableCell>
                    <Checkbox 
                      checked={item.included}
                      onCheckedChange={() => handleIncludeToggle(index)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.cost_code_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-20"
                      min="0"
                      step="0.1"
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatUnitOfMeasure(item.unit_of_measure)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getConfidenceBadgeVariant(item.confidence)}>
                      {item.confidence}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedCount === 0}>
            {isSaving ? 'Saving...' : `Save ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
