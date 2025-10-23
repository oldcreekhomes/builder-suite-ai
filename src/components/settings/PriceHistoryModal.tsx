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
    if (!open || !el) return;

    const setFromRect = () => {
      const rect = el.getBoundingClientRect();
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
  }, [open]);

  // Delay chart render until dialog is open and layout has settled
  useEffect(() => {
    if (open) {
      setReady(false);
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
    setReady(false);
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
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateYearChartData = () => {
    const currentPrice = Number(costCode.price || 0);
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Generate all 12 months of the current year (Jan-Dec)
    const yearMonths = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 15); // 15th of each month
      return {
        monthName: format(date, 'MMM'),
        monthDate: date,
        fullDate: format(date, 'MMM yyyy')
      };
    });
    
    // If no history, show current price for all months
    if (history.length === 0) {
      return yearMonths.map(({ monthName, fullDate }) => ({
        date: monthName,
        price: currentPrice,
        fullDate
      }));
    }
    
    // Sort history by date (oldest first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    
    // For each month, find the most recent price at or before that month
    return yearMonths.map(({ monthName, monthDate, fullDate }) => {
      let activePrice = currentPrice; // Default to current price
      
      // Find the most recent price change before or on this month
      for (const record of sortedHistory) {
        const recordDate = new Date(record.changed_at);
        if (recordDate <= monthDate) {
          activePrice = Number(record.price || 0);
        }
      }
      
      // If we're in a future month, use current price
      if (monthDate > today) {
        activePrice = currentPrice;
      }
      
      return {
        date: monthName,
        price: activePrice,
        fullDate
      };
    });
  };

  const calculateVolatility = () => {
    const currentPrice = Number(costCode.price || 0);
    
    if (history.length === 0) {
      return { min: currentPrice, max: currentPrice, volatility: 0, priceChange: 0, isNegative: false };
    }

    const prices = history.map(h => Number(h.price));
    const min = Math.min(...prices, currentPrice);
    const max = Math.max(...prices, currentPrice);
    const volatility = max - min;
    
    // Calculate price change from first to last
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    const firstPrice = sortedHistory[0] ? Number(sortedHistory[0].price) : currentPrice;
    const priceChange = currentPrice - firstPrice;
    const isNegative = priceChange < 0;

    return { min, max, volatility, priceChange, isNegative };
  };

  const stats = calculateVolatility();
  const chartData = generateYearChartData();
  
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
                  formatter={(value: any) => [`$${Number(value ?? 0).toFixed(2)}`, 'Price']}
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
            <p className="text-sm text-muted-foreground">Price Change</p>
            <p className={`text-lg font-semibold ${stats.isNegative ? 'text-red-600' : 'text-green-600'}`}>
              {stats.isNegative ? '-' : '+'}${Math.abs(stats.priceChange).toFixed(2)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
