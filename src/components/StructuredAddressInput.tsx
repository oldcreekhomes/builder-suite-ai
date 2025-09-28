import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface StructuredAddressData {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
}

interface StructuredAddressInputProps {
  value: StructuredAddressData;
  onChange: (value: StructuredAddressData) => void;
  disabled?: boolean;
}

export function StructuredAddressInput({ 
  value, 
  onChange, 
  disabled = false 
}: StructuredAddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const getApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) throw error;
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Failed to get Google Maps API key:', error);
      }
    };

    getApiKey();
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      script.onerror = () => console.error('Failed to load Google Maps API');
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [apiKey]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.address_components) {
          const addressData: StructuredAddressData = {
            address_line_1: '',
            address_line_2: value.address_line_2, // Keep existing suite number
            city: '',
            state: '',
            zip_code: ''
          };

          // Parse address components
          place.address_components.forEach((component) => {
            const types = component.types;
            
            if (types.includes('street_number')) {
              addressData.address_line_1 = component.long_name + ' ';
            } else if (types.includes('route')) {
              addressData.address_line_1 += component.long_name;
            } else if (types.includes('locality')) {
              addressData.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              addressData.state = component.short_name;
            } else if (types.includes('postal_code')) {
              addressData.zip_code = component.long_name;
            }
          });

          onChange(addressData);
        }
      });

    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isLoaded, onChange, value.address_line_2]);

  const handleFieldChange = (field: keyof StructuredAddressData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="address_line_1">Street Address *</Label>
        <Input
          ref={inputRef}
          id="address_line_1"
          value={value.address_line_1}
          onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
          placeholder={isLoaded ? "Start typing address..." : "Enter street address"}
          disabled={disabled}
          autoComplete="street-address"
        />
        {isLoaded && (
          <p className="text-xs text-muted-foreground mt-1">
            Search powered by Google Places - start typing to see suggestions
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="address_line_2">Suite/Unit/Floor</Label>
        <Input
          id="address_line_2"
          value={value.address_line_2}
          onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
          placeholder="Suite 100, Unit A, Floor 5, etc."
          disabled={disabled}
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={value.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="Enter city"
            disabled={disabled}
            autoComplete="address-level2"
          />
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={value.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            placeholder="TX"
            disabled={disabled}
            autoComplete="address-level1"
            maxLength={2}
          />
        </div>

        <div>
          <Label htmlFor="zip_code">ZIP Code</Label>
          <Input
            id="zip_code"
            value={value.zip_code}
            onChange={(e) => handleFieldChange('zip_code', e.target.value)}
            placeholder="12345"
            disabled={disabled}
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
}