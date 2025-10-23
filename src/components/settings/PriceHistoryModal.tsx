import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { formatDistanceToNow, format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

type PriceHistory = Tables<'cost_code_price_history'>;
type CostCode = Tables<'cost_codes'>;

interface PriceHistoryModalProps {
  costCode: CostCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistoryModal({ costCode, open, onOpenChange }: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && costCode.id) {
      fetchPriceHistory();
    }
  }, [open, costCode.id]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cost_code_price_history')
        .select('*')
        .eq('cost_code_id', costCode.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVolatility = () => {
    if (history.length < 2) return { min: 0, max: 0, volatility: 0, changes: 0 };

    const prices = history.map(h => Number(h.price)).reverse();
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const volatility = max - min;
    const changes = history.length - 1;

    return { min, max, volatility, changes };
  };

  const getChangeIndicator = (currentPrice: number, previousPrice: number) => {
    if (currentPrice > previousPrice) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (currentPrice < previousPrice) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const stats = calculateVolatility();

  // Prepare chart data - reverse so oldest is on the left
  const chartData = [...history]
    .reverse()
    .map(record => ({
      date: format(new Date(record.changed_at), 'MMM yyyy'),
      price: Number(record.price),
      fullDate: new Date(record.changed_at).toLocaleDateString(),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Price History: {costCode.code} - {costCode.name}
          </DialogTitle>
          <DialogDescription>
            Track pricing changes over time
          </DialogDescription>
        </DialogHeader>

        {/* Price Chart */}
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ChartContainer
              config={{
                price: {
                  label: "Price",
                  color: "hsl(var(--primary))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    labelFormatter={(label, payload) => 
                      payload?.[0]?.payload?.fullDate || label
                    }
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data to display</p>
          </div>
        )}

        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-lg font-semibold">${costCode.price?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Min Price</p>
            <p className="text-lg font-semibold">${stats.min.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Price</p>
            <p className="text-lg font-semibold">${stats.max.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volatility</p>
            <p className="text-lg font-semibold">${stats.volatility.toFixed(2)}</p>
          </div>
        </div>

        {/* Price History Timeline */}
        <div className="space-y-4">
          <h3 className="font-semibold">Price Changes ({stats.changes} total)</h3>
          
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No price history available</p>
          ) : (
            <div className="space-y-2">
              {history.map((record, index) => {
                const previousPrice = index < history.length - 1 ? Number(history[index + 1].price) : null;
                const currentPrice = Number(record.price);
                
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {previousPrice !== null && getChangeIndicator(currentPrice, previousPrice)}
                      <div>
                        <p className="font-medium">${currentPrice.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.changed_at).toLocaleDateString()} at{' '}
                          {new Date(record.changed_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(record.changed_at), { addSuffix: true })}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">{record.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
