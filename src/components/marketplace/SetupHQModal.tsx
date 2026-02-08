import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Building2, Loader2, AlertCircle } from "lucide-react";
import { UpdateHQData } from "@/hooks/useCompanyHQ";
import { useGooglePlacesAddress, AddressData } from "@/hooks/useGooglePlacesAddress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SetupHQModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: UpdateHQData) => void;
  isLoading: boolean;
}

export function SetupHQModal({ open, onOpenChange, onSave, isLoading }: SetupHQModalProps) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePlaceSelected = useCallback((addressData: AddressData) => {
    setAddress(addressData.street);
    setCity(addressData.city);
    setState(addressData.state);
    setZip(addressData.zip);
    setLat(addressData.lat);
    setLng(addressData.lng);
  }, []);

  const { isLoading: isGoogleLoading, error: googleError, isGoogleLoaded } = useGooglePlacesAddress({
    inputRef,
    isActive: open,
    onPlaceSelected: handlePlaceSelected,
  });

  const handleSubmit = () => {
    if (!address || !city || !state || !zip || lat === null || lng === null) return;
    
    onSave({
      hq_address: address,
      hq_city: city,
      hq_state: state,
      hq_zip: zip,
      hq_lat: lat,
      hq_lng: lng,
    });
  };

  const isValid = address && city && state && zip && lat !== null && lng !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Set Up Your Headquarters
          </DialogTitle>
          <DialogDescription>
            To browse the marketplace, we need to know where your company is located.
            Enter your business address to see suppliers within 30 miles (free).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {googleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{googleError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="search-address">Search Address</Label>
            <div className="relative">
              {isGoogleLoading ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                ref={inputRef}
                id="search-address"
                placeholder={isGoogleLoading ? "Loading address search..." : "Start typing your address..."}
                className="pl-9"
                disabled={isGoogleLoading || !!googleError}
              />
            </div>
            {!isGoogleLoading && !googleError && isGoogleLoaded && (
              <p className="text-xs text-muted-foreground">
                Type your address and select from the dropdown
              </p>
            )}
          </div>

          {address && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Street Address</Label>
                  <p className="text-sm font-medium">{address}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="text-sm font-medium">{city}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <p className="text-sm font-medium">{state}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP</Label>
                    <p className="text-sm font-medium">{zip}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
            className="w-full"
          >
            {isLoading ? "Saving..." : "Continue to Marketplace"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
