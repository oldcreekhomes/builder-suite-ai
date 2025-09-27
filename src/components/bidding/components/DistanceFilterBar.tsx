import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, MapPin, HelpCircle, Store } from 'lucide-react';

interface BiddingCompany {
  id: string;
  company_id: string;
  companies: {
    id: string;
    company_name: string;
    address?: string;
  };
}

interface DistanceFilterBarProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  radiusMiles: number;
  onRadiusChange: (radius: number) => void;
  projectAddress?: string;
  companies: BiddingCompany[];
  isCalculating: boolean;
}

export function DistanceFilterBar({
  enabled,
  onEnabledChange,
  radiusMiles,
  onRadiusChange,
  projectAddress,
  companies,
  isCalculating
}: DistanceFilterBarProps) {
  const hasProjectAddress = projectAddress && projectAddress.trim();
  const canEnableFilter = hasProjectAddress && companies.length > 0;

  return (
    <TooltipProvider>
      <div className="flex gap-4">
        {/* Filter by Distance Box */}
        <div className="flex-1 bg-gray-50/50 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filter by Distance</span>
              </div>
              
              <Switch
                checked={enabled}
                onCheckedChange={onEnabledChange}
                disabled={!canEnableFilter}
              />
              
              {enabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Within</span>
                  <Select
                    value={radiusMiles.toString()}
                    onValueChange={(value) => onRadiusChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">miles</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-5 w-5 text-black cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filter companies based on their distance from the project location</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isCalculating && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Calculating...</span>
                </div>
              )}
            </div>
          </div>

          {!hasProjectAddress && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Project address required for distance filtering
            </div>
          )}
        </div>

        {/* MarketPlace Box */}
        <div className="flex-1 bg-gray-50/50 border rounded-lg p-4 flex items-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">MarketPlace</span>
              </div>
              <span className="text-sm text-gray-600">What is MarketPlace?</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}