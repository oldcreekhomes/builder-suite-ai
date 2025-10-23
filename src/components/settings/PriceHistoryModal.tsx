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

  const generateYearChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = 2025;
    const currentPrice = Number(costCode.price || 0);
    
    // If no history, show current price across all months
    if (history.length === 0) {
      return months.map(month => ({
        date: month,
        price: currentPrice,
        fullDate: `${month} ${currentYear}`
      }));
    }
    
    // If we have history, calculate price for each month
    // Sort history by date (oldest first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    
    return months.map((month, index) => {
      const monthDate = new Date(currentYear, index, 15); // Middle of month
      
      // Find the most recent price change before or on this month
      let activePrice = currentPrice;
      
      for (const record of sortedHistory) {
        const recordDate = new Date(record.changed_at);
        if (recordDate <= monthDate) {
          activePrice = Number(record.price);
        } else {
          break;
        }
      }
      
      return {
        date: month,
        price: activePrice,
        fullDate: `${month} ${currentYear}`
      };
    });
  };

  const calculateVolatility = () => {
    const currentPrice = Number(costCode.price || 0);
    
    if (history.length === 0) {
      return { min: currentPrice, max: currentPrice, volatility: 0 };
    }

    const prices = history.map(h => Number(h.price));
    const min = Math.min(...prices, currentPrice);
    const max = Math.max(...prices, currentPrice);
    const volatility = max - min;

    return { min, max, volatility };
  };

  const stats = calculateVolatility();
  const chartData = generateYearChartData();

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
      </DialogContent>
    </Dialog>
  );
}
