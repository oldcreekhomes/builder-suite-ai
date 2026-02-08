import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Building2, Save } from "lucide-react";
import { useCompanyHQ, UpdateHQData } from "@/hooks/useCompanyHQ";

export function CompanyProfileTab() {
  const { hqData, isLoading, updateHQ, isUpdating } = useCompanyHQ();
  
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load existing data
  useEffect(() => {
    if (hqData) {
      setAddress(hqData.hq_address || "");
      setCity(hqData.hq_city || "");
      setState(hqData.hq_state || "");
      setZip(hqData.hq_zip || "");
      setLat(hqData.hq_lat);
      setLng(hqData.hq_lng);
    }
  }, [hqData]);

  const handlePlaceSelect = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.address_components || !place.geometry?.location) return;

    let streetNumber = "";
    let streetName = "";
    let cityValue = "";
    let stateValue = "";
    let zipValue = "";

    for (const component of place.address_components) {
      const type = component.types[0];
      switch (type) {
        case "street_number":
          streetNumber = component.long_name;
          break;
        case "route":
          streetName = component.long_name;
          break;
        case "locality":
          cityValue = component.long_name;
          break;
        case "administrative_area_level_1":
          stateValue = component.short_name;
          break;
        case "postal_code":
          zipValue = component.long_name;
          break;
      }
    }

    const fullAddress = streetNumber ? `${streetNumber} ${streetName}` : streetName;
    
    setAddress(fullAddress);
    setCity(cityValue);
    setState(stateValue);
    setZip(zipValue);
    setLat(place.geometry.location.lat());
    setLng(place.geometry.location.lng());
    setHasChanges(true);
  }, []);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry"],
    });

    autocomplete.addListener("place_changed", handlePlaceSelect);
    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [handlePlaceSelect]);

  const handleSave = () => {
    if (!address || !city || !state || !zip || lat === null || lng === null) return;
    
    updateHQ({
      hq_address: address,
      hq_city: city,
      hq_state: state,
      hq_zip: zip,
      hq_lat: lat,
      hq_lng: lng,
    });
    setHasChanges(false);
  };

  const isValid = address && city && state && zip && lat !== null && lng !== null;

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading company profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Company Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company's headquarters information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Headquarters
          </CardTitle>
          <CardDescription>
            This address determines your free marketplace search radius (30 miles).
            Suppliers beyond this range require a paid subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-address">Search Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                id="search-address"
                placeholder="Start typing to search for your address..."
                defaultValue={address}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Type your address and select from the dropdown to auto-fill
            </p>
          </div>

          {address && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Street Address</Label>
                  <Input 
                    value={address} 
                    onChange={(e) => { setAddress(e.target.value); setHasChanges(true); }}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input 
                      value={city} 
                      onChange={(e) => { setCity(e.target.value); setHasChanges(true); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Input 
                      value={state} 
                      onChange={(e) => { setState(e.target.value); setHasChanges(true); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                    <Input 
                      value={zip} 
                      onChange={(e) => { setZip(e.target.value); setHasChanges(true); }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              
              {lat && lng && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={handleSave} 
            disabled={!isValid || !hasChanges || isUpdating}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isUpdating ? "Saving..." : "Save Address"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
