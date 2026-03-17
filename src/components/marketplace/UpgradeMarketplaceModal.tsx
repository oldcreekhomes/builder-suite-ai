import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, MapPin, Lock } from "lucide-react";
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";

interface UpgradeMarketplaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAreas: string[];
}

export function UpgradeMarketplaceModal({
  open,
  onOpenChange,
  currentAreas,
}: UpgradeMarketplaceModalProps) {
  const lockedAreas = SERVICE_AREA_OPTIONS.filter(a => !currentAreas.includes(a));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Expand Your Reach
          </DialogTitle>
          <DialogDescription>
            Your current plan includes {currentAreas.length === 1 ? '1 service area' : `${currentAreas.length} service areas`}.
            Add additional regions to discover more suppliers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Current areas */}
          <div>
            <p className="text-sm font-medium mb-2">Your Service Areas</p>
            {currentAreas.map(area => (
              <div key={area} className="flex items-center gap-2 py-1.5 px-3 bg-muted/50 rounded-md mb-1">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">{area}</span>
                <span className="text-xs text-muted-foreground ml-auto">Included</span>
              </div>
            ))}
          </div>

          {/* Locked areas */}
          {lockedAreas.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Available Regions</p>
              {lockedAreas.map(area => (
                <Card key={area} className="mb-2">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">{area}</span>
                    </div>
                    <Button size="sm" variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
