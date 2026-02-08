import { MapPin, Lock, Crown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionTier, TIER_LIMITS } from "@/hooks/useMarketplaceSubscription";

interface MarketplaceRadiusControlProps {
  hqCity: string | null;
  hqState: string | null;
  currentRadius: number;
  maxRadius: number;
  tier: SubscriptionTier;
  filteredCount: number;
  totalCount: number;
  onRadiusChange: (radius: number) => void;
  onUpgradeClick: () => void;
}

export function MarketplaceRadiusControl({
  hqCity,
  hqState,
  currentRadius,
  maxRadius,
  tier,
  filteredCount,
  totalCount,
  onRadiusChange,
  onUpgradeClick,
}: MarketplaceRadiusControlProps) {
  const hqDisplay = hqCity && hqState ? `${hqCity}, ${hqState}` : 'Not set';
  
  // Calculate slider value (0-100 scale)
  const sliderMax = tier === 'enterprise' ? 500 : maxRadius;
  const sliderValue = Math.min(currentRadius, sliderMax);

  const handleSliderChange = (values: number[]) => {
    const newRadius = values[0];
    if (newRadius <= maxRadius) {
      onRadiusChange(newRadius);
    } else {
      // Trigger upgrade modal if trying to exceed limit
      onUpgradeClick();
    }
  };

  return (
    <div className="bg-background border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Your HQ:</span>
          <span className="text-sm font-medium">{hqDisplay}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tier === 'free' ? 'secondary' : 'default'} className="gap-1">
            {tier === 'enterprise' && <Crown className="h-3 w-3" />}
            {TIER_LIMITS[tier].label}
          </Badge>
          {tier === 'free' && (
            <Button variant="outline" size="sm" onClick={onUpgradeClick}>
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Search Radius</span>
          <span className="text-sm text-muted-foreground">
            {tier === 'enterprise' ? 'Unlimited' : `${currentRadius} miles`}
          </span>
        </div>

        <div className="relative">
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            max={sliderMax}
            min={5}
            step={5}
            className="w-full"
          />
          
          {/* Tier markers */}
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>5 mi</span>
            <div className="flex items-center gap-1">
              <span>30 mi</span>
              <span className="text-primary font-medium">FREE</span>
            </div>
            {tier !== 'enterprise' && (
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>100 mi</span>
                <span className="text-primary font-medium">PRO</span>
              </div>
            )}
            {tier === 'enterprise' && (
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-accent-foreground" />
                <span>Unlimited</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <span className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredCount}</span> suppliers within {currentRadius} miles
          {filteredCount < totalCount && (
            <span className="text-muted-foreground"> (of {totalCount} total)</span>
          )}
        </span>
      </div>
    </div>
  );
}
