import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type CostCode = Tables<'cost_codes'>;
type PriceHistory = Tables<'cost_code_price_history'>;

interface PriceHistoryManagerProps {
  costCode: CostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistoryManager({ costCode, open, onOpenChange }: PriceHistoryManagerProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [historicalPrice, setHistoricalPrice] = useState("");
  const [historicalDate, setHistoricalDate] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && costCode) {
      fetchPriceHistory();
      // Set default date to today
      setHistoricalDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, costCode]);

  const fetchPriceHistory = async () => {
    if (!costCode) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cost_code_price_history')
        .select('*')
        .eq('cost_code_id', costCode.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast({
        title: "Error",
        description: "Failed to load price history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddHistoricalPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!costCode || !historicalPrice || !historicalDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate that the date is not in the future
    const selectedDate = new Date(historicalDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    
    if (selectedDate > today) {
      toast({
        title: "Invalid Date",
        description: "Cannot add price history for future dates",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('cost_code_price_history')
        .insert({
          cost_code_id: costCode.id,
          price: parseFloat(historicalPrice),
          changed_at: new Date(historicalDate).toISOString(),
          changed_by: user?.id,
          owner_id: costCode.owner_id,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Historical price added successfully",
      });

      // Reset form
      setHistoricalPrice("");
      setHistoricalDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
      
      // Refresh the list
      fetchPriceHistory();
    } catch (error) {
      console.error('Error adding historical price:', error);
      toast({
        title: "Error",
        description: "Failed to add historical price",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Price History</SheetTitle>
          <SheetDescription>
            {costCode?.code} - {costCode?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Add Historical Price Form */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Add Historical Price</h3>
            <form onSubmit={handleAddHistoricalPrice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="historical-date">Date *</Label>
                  <Input
                    id="historical-date"
                    type="date"
                    value={historicalDate}
                    onChange={(e) => setHistoricalDate(e.target.value)}
                    max={format(new Date(), "yyyy-MM-dd")}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="historical-price">Price *</Label>
                  <Input
                    id="historical-price"
                    type="number"
                    step="0.01"
                    value={historicalPrice}
                    onChange={(e) => setHistoricalPrice(e.target.value)}
                    placeholder="Enter price"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this price change..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Add Historical Price
              </Button>
            </form>
          </div>

          {/* Price History Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Price History</h3>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : priceHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground">No price history yet</div>
            ) : (
              <div className="space-y-3">
                {priceHistory.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        ${parseFloat(entry.price.toString()).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <div className="text-sm text-muted-foreground">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
