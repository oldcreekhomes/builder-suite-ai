import React, { useEffect, useRef, useState } from 'react';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatUnitOfMeasure } from '@/utils/budgetUtils';
import { toast } from '@/hooks/use-toast';

type PriceHistory = Tables<'cost_code_price_history'>;
type CostCode = Tables<'cost_codes'>;

interface PriceHistoryModalProps {
  costCode: CostCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPriceSync?: () => void;
  skipAutoSync?: boolean;
}

export function PriceHistoryModal({ 
  costCode, 
  open, 
  onOpenChange, 
  onPriceSync,
  skipAutoSync = false 
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart sizing and mount readiness
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (open && costCode.id) {
      fetchPriceHistory();
    }
  }, [open, costCode.id]);

  // Track container size with initial measurement + ResizeObserver + window resize
  useEffect(() => {
    const el = containerRef.current;
    if (!open || loading || !el) return;

    const setFromRect = () => {
      const rect = el.getBoundingClientRect();
      console.debug('price-history:init-measure');
      setSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height),
      });
    };

    // Initial measurement so size isn't stuck at 0
    setFromRect();

    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) {
        setSize({
          width: Math.max(0, cr.width),
          height: Math.max(0, cr.height),
        });
      }
    });

    observer.observe(el);
    window.addEventListener('resize', setFromRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', setFromRect);
    };
  }, [open, loading]);

  // Set ready when we have a valid size
  useEffect(() => {
    if (!open) return;
    if (size.width > 0) setReady(true);
  }, [open, size.width]);

  // Reset ready when dialog closes
  useEffect(() => {
    if (!open) setReady(false);
  }, [open]);

  // Debug: log size changes while modal is open
  useEffect(() => {
    if (open) {
      console.debug('price-history:size', size);
    }
  }, [size, open]);

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
      
      // AUTO-SYNC: Update cost code price to match most recent history
      if (data && data.length > 0) {
        const mostRecentHistoricalPrice = Number(data[0].price || 0);
        const currentTablePrice = Number(costCode.price || 0);
        
        // If they don't match, sync the historical price to the table
        if (mostRecentHistoricalPrice !== currentTablePrice) {
          if (skipAutoSync) {
            console.log('⚠️ Auto-sync skipped - edit dialog is open');
            toast({
              title: "Auto-sync disabled",
              description: "Close the edit dialog to enable automatic price synchronization.",
              variant: "destructive",
            });
          } else {
            console.log('🔄 Auto-syncing price from history:', {
              currentTablePrice,
              mostRecentHistoricalPrice,
              willUpdate: true
            });

            const { error: updateError } = await supabase
              .from('cost_codes')
              .update({ 
                price: mostRecentHistoricalPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', costCode.id);

            if (updateError) {
              console.error('Error auto-syncing price:', updateError);
              toast({
                title: "Error syncing price",
                description: updateError.message,
                variant: "destructive",
              });
            } else {
              console.log('✅ Price auto-synced successfully');
              // Notify parent to refetch
              onPriceSync?.();
              toast({
                title: "Price updated",
                description: `Price synced to $${mostRecentHistoricalPrice.toLocaleString()} from history`,
              });
            }
          }
        } else {
          console.log('✅ Price already in sync');
        }
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHistoricalChartData = () => {
    const currentPrice = Number(costCode.price || 0);
    const today = new Date();
    
    // If no history, show current price for past 12 months
    if (history.length === 0) {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(15);
        months.push({
          date: format(date, 'MMM yy'),
          price: currentPrice,
          fullDate: format(date, 'MMM yyyy')
        });
      }
      return months;
    }
    
    // Sort history oldest first
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    
    // Find date range: earliest history to 3 months in future
    const earliestDate = new Date(sortedHistory[0].changed_at);
    const latestDate = new Date(today);
    latestDate.setMonth(latestDate.getMonth() + 3); // Show 3 months into future
    
    // Get the most recent price (either from history or current)
    const lastHistoricalPrice = Number(sortedHistory[sortedHistory.length - 1].price || 0);
    const mostRecentPrice = currentPrice > 0 ? currentPrice : lastHistoricalPrice;
    
    // Generate monthly data points from earliest to latest
    const months = [];
    const currentDate = new Date(earliestDate);
    currentDate.setDate(15); // 15th of each month
    
    // Get the price before the earliest history entry (use first historical price)
    const earliestPrice = Number(sortedHistory[0].price || 0);
    
    while (currentDate <= latestDate) {
      // For this month, find the active price
      let activePrice = earliestPrice;
      
      // Find the most recent price change at or before this month
      for (const record of sortedHistory) {
        const recordDate = new Date(record.changed_at);
        if (recordDate <= currentDate) {
          activePrice = Number(record.price || 0);
        }
      }
      
      // For future months, use the most recent price
      if (currentDate > today) {
        activePrice = mostRecentPrice;
      }
      
      months.push({
        date: format(currentDate, 'MMM yy'),
        price: activePrice,
        fullDate: format(currentDate, 'MMM yyyy')
      });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  };

  const calculateVolatility = () => {
    // Always show the actual table price as "Current Price"
    const currentPrice = Number(costCode.price || 0);
    
    if (history.length === 0) {
      return { 
        currentPrice: currentPrice, 
        min: currentPrice, 
        max: currentPrice, 
        volatility: 0, 
        priceChange: 0, 
        percentChange: 0, 
        isNegative: false 
      };
    }

    // Sort history by date (newest first) to get most recent historical price
    const sortedHistoryNewest = [...history].sort((a, b) => 
      new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );
    const mostRecentHistoricalPrice = Number(sortedHistoryNewest[0].price || 0);
    
    // For change calculations: if current price exists (>0), compare to it; else use most recent historical
    const priceForCalculation = currentPrice > 0 ? currentPrice : mostRecentHistoricalPrice;
    
    // Calculate min/max from historical prices (and current if valid)
    const prices = history.map(h => Number(h.price));
    const validPrices = currentPrice > 0 ? [...prices, currentPrice] : prices;
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const volatility = max - min;
    
    // Calculate price change from earliest to most recent/current
    const sortedHistoryOldest = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    const firstPrice = Number(sortedHistoryOldest[0].price || 0);
    const priceChange = priceForCalculation - firstPrice;
    const percentChange = firstPrice > 0 ? ((priceChange / firstPrice) * 100) : 0;
    const isNegative = priceChange < 0;

    return { 
      currentPrice: currentPrice, // Always show actual table value
      min, 
      max, 
      volatility, 
      priceChange, 
      percentChange, 
      isNegative 
    };
  };

  const stats = calculateVolatility();
  const chartData = generateHistoricalChartData();
  
  // Calculate safe Y-axis domain
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const yDomain = minPrice === maxPrice 
    ? [Math.max(0, minPrice - Math.max(1, minPrice * 0.1)), maxPrice + Math.max(1, maxPrice * 0.1)]
    : ['auto', 'auto'];

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
          <div ref={containerRef} className="relative z-10 h-[300px] w-full min-w-0">
            {ready && size.width > 0 ? (
              <LineChart
                key={`${open}-${size.width}-${size.height}`}
                width={Math.max(0, size.width)}
                height={Math.max(0, size.height || 300)}
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(value) => `$${Number(value ?? 0).toFixed(2)}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value ?? 0).toFixed(2)}/${formatUnitOfMeasure(costCode.unit_of_measure)}`, 'Price']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
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
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Preparing chart...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data to display</p>
          </div>
        )}

        {/* Statistics Summary */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-lg font-semibold">${stats.currentPrice.toFixed(2)}</p>
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
            <p className="text-sm text-muted-foreground">Price Change</p>
            <p className={`text-lg font-semibold ${stats.isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {stats.isNegative ? '-' : '+'}${Math.abs(stats.priceChange).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">% Change</p>
            <p className={`text-lg font-semibold ${stats.isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {stats.isNegative ? '-' : '+'}${Math.abs(stats.percentChange).toFixed(1)}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
