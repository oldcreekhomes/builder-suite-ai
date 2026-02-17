import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Loader2, MapPin } from 'lucide-react';

interface DistanceFilterBarProps {
  radiusMiles: number;
  onRadiusChange: (radius: number) => void;
  projectAddress?: string;
  filteredCount: number;
  totalCount: number;
  isCalculating: boolean;
}

export function DistanceFilterBar({
  radiusMiles,
  onRadiusChange,
  projectAddress,
  filteredCount,
  totalCount,
  isCalculating
}: DistanceFilterBarProps) {
  const hasProjectAddress = projectAddress && projectAddress.trim();

  return (
    <div className="bg-gray-50/50 border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Distance: {radiusMiles} miles</span>
        </div>
        {isCalculating && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Calculating...</span>
          </div>
        )}
      </div>

      {hasProjectAddress ? (
        <>
          <div className="px-1">
            <Slider
              value={[radiusMiles]}
              onValueChange={([value]) => onRadiusChange(value)}
              min={0}
              max={75}
              step={5}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0 mi</span>
            <span>
              Showing {filteredCount} of {totalCount} suppliers within {radiusMiles} miles
            </span>
            <span>75 mi</span>
          </div>
        </>
      ) : (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Project address required for distance filtering
        </div>
      )}
    </div>
  );
}
