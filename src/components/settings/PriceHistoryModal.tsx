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
    const today = new Date();
    
    // If no history, show current price as flat line for past 12 months
    let currentPrice = Number(costCode.price || 0);
    if (currentPrice === 0 && history.length > 0) {
      const sorted = [...history].sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
      currentPrice = Number(sorted[0].price || 0);
    }

    if (history.length === 0) {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(15);
        months.push({
          date: format(date, 'MMM dd'),
          price: currentPrice,
          fullDate: format(date, 'MMM dd, yyyy')
        });
      }
      return months;
    }

    // Sort history oldest first
    const sorted = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );

    const dataPoints: { date: string; price: number; fullDate: string }[] = [];

    sorted.forEach((entry, i) => {
      const entryDate = new Date(entry.changed_at);
      const price = Number(entry.price || 0);

      // Add carry-forward point (day before this change) using previous price
      if (i > 0) {
        const dayBefore = new Date(entryDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const prevPrice = Number(sorted[i - 1].price || 0);
        dataPoints.push({
          date: format(dayBefore, 'MMM dd'),
          price: prevPrice,
          fullDate: format(dayBefore, 'MMM dd, yyyy'),
        });
      }

      // Add the actual price change point
      dataPoints.push({
        date: format(entryDate, 'MMM dd'),
        price,
        fullDate: format(entryDate, 'MMM dd, yyyy'),
      });
    });

    // Add today as the final point with the most recent price
    const lastPrice = Number(sorted[sorted.length - 1].price || 0);
    const todayStr = format(today, 'MMM dd');
    const lastPoint = dataPoints[dataPoints.length - 1];
    if (!lastPoint || lastPoint.date !== todayStr) {
      dataPoints.push({
        date: todayStr,
        price: currentPrice > 0 ? currentPrice : lastPrice,
        fullDate: format(today, 'MMM dd, yyyy'),
      });
    }

    return dataPoints;
  };

  const calculateVolatility = () => {
    // If price is null/0 but history exists, use most recent historical price
    let currentPrice = Number(costCode.price || 0);
    if (currentPrice === 0 && history.length > 0) {
      const sortedHistory = [...history].sort((a, b) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
      currentPrice = Number(sortedHistory[0].price || 0);
    }
    
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
                  tickFormatter={(value) => `$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${formatUnitOfMeasure(costCode.unit_of_measure)}`, 'Price']}
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
            <p className="text-lg font-semibold">${stats.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Min Price</p>
            <p className="text-lg font-semibold">${stats.min.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Price</p>
            <p className="text-lg font-semibold">${stats.max.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price Change</p>
            <p className={`text-lg font-semibold ${stats.isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {stats.isNegative ? '-' : '+'}${Math.abs(stats.priceChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">% Change</p>
            <p className={`text-lg font-semibold ${stats.isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {stats.isNegative ? '-' : '+'}${Math.abs(stats.percentChange).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
