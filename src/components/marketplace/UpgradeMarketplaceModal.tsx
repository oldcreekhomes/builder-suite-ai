import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, MapPin, Zap } from "lucide-react";
import { TIER_LIMITS, SubscriptionTier } from "@/hooks/useMarketplaceSubscription";

interface UpgradeMarketplaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export function UpgradeMarketplaceModal({
  open,
  onOpenChange,
  currentTier,
  onSelectTier,
}: UpgradeMarketplaceModalProps) {
  const handleSelectPro = () => {
    onSelectTier('pro');
    // TODO: Integrate with Stripe checkout
    onOpenChange(false);
  };

  const handleSelectEnterprise = () => {
    onSelectTier('enterprise');
    // TODO: Integrate with Stripe checkout
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Expand Your Reach
          </DialogTitle>
          <DialogDescription>
            Your free plan includes suppliers within 30 miles of your headquarters.
            Upgrade to access suppliers across your entire region or nationwide.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Pro Tier */}
          <Card className={`relative ${currentTier === 'pro' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Pro
                </CardTitle>
                {currentTier === 'pro' && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Current Plan
                  </span>
                )}
              </div>
              <CardDescription>Regional access for growing builders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">${TIER_LIMITS.pro.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Up to 100-mile radius
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Access to all suppliers in region
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Unlimited messages
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Priority support
                </li>
              </ul>

              <Button 
                className="w-full" 
                onClick={handleSelectPro}
                disabled={currentTier === 'pro' || currentTier === 'enterprise'}
              >
                {currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Tier */}
          <Card className={`relative ${currentTier === 'enterprise' ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-accent-foreground" />
                  Enterprise
                </CardTitle>
                {currentTier === 'enterprise' && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Current Plan
                  </span>
                )}
              </div>
              <CardDescription>National access for large operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-3xl font-bold">${TIER_LIMITS.enterprise.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Unlimited search radius
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Nationwide supplier access
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  API access for integrations
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Dedicated account manager
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant="secondary"
                onClick={handleSelectEnterprise}
                disabled={currentTier === 'enterprise'}
              >
                {currentTier === 'enterprise' ? 'Current Plan' : 'Upgrade to Enterprise'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Continue with Free
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
