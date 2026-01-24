import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { US_STATES } from "@/lib/us-states";

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

// Parse address components from Google Places API response with robust fallbacks
const parseAddressComponents = (
  addressComponents: google.maps.GeocoderAddressComponent[],
  existingAddressLine2: string
): StructuredAddressData => {
  const addressData: StructuredAddressData = {
    address_line_1: '',
    address_line_2: existingAddressLine2,
    city: '',
    state: '',
    zip_code: ''
  };

  let streetNumber = '';
  let route = '';
  let subpremise = '';

  // Priority order for city fallbacks
  let locality = '';
  let postalTown = '';
  let sublocality = '';
  let sublocalityLevel1 = '';
  let neighborhood = '';
  let adminLevel3 = '';
  let adminLevel2 = '';

  for (const component of addressComponents) {
    const types = component.types;
    
    // Street components
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('subpremise')) {
      subpremise = component.long_name;
    }
    
    // City/locality components (collect all, pick best later)
    else if (types.includes('locality')) {
      locality = component.long_name;
    } else if (types.includes('postal_town')) {
      postalTown = component.long_name;
    } else if (types.includes('sublocality')) {
      sublocality = component.long_name;
    } else if (types.includes('sublocality_level_1')) {
      sublocalityLevel1 = component.long_name;
    } else if (types.includes('neighborhood')) {
      neighborhood = component.long_name;
    } else if (types.includes('administrative_area_level_3')) {
      adminLevel3 = component.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      adminLevel2 = component.long_name;
    }
    
    // State and ZIP
    else if (types.includes('administrative_area_level_1')) {
      addressData.state = component.short_name;
    } else if (types.includes('postal_code')) {
      addressData.zip_code = component.long_name;
    } else if (types.includes('postal_code_suffix') && addressData.zip_code) {
      // Append suffix for full ZIP+4
      addressData.zip_code = `${addressData.zip_code}-${component.long_name}`;
    }
  }

  // Build address line 1
  addressData.address_line_1 = [streetNumber, route].filter(Boolean).join(' ');
  
  // If there's a subpremise and no address_line_2, use it
  if (subpremise && !existingAddressLine2) {
    addressData.address_line_2 = subpremise;
  }

  // Pick city using priority fallbacks
  addressData.city = locality || postalTown || sublocalityLevel1 || sublocality || 
                     neighborhood || adminLevel3 || adminLevel2 || '';

  console.log('[parseAddressComponents] Parsed result:', addressData);
  return addressData;
};

export function StructuredAddressInput({ 
  value, 
  onChange, 
  disabled = false 
}: StructuredAddressInputProps) {
  // Use uncontrolled input for street address to prevent Google/React race condition
  const streetInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  
  // Track if we're in the middle of processing a place selection
  const isProcessingSelectionRef = useRef<boolean>(false);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  
  // Local state for other fields (synced with parent)
  const [localAddressLine2, setLocalAddressLine2] = useState(value.address_line_2);
  const [localCity, setLocalCity] = useState(value.city);
  const [localState, setLocalState] = useState(value.state);
  const [localZipCode, setLocalZipCode] = useState(value.zip_code);

  // Find the full state name for display
  const selectedState = US_STATES.find(s => s.abbreviation === localState);

  // Sync local state with parent value when it changes externally
  useEffect(() => {
    // Only sync if we're NOT processing a selection (to prevent overwriting our parsed data)
    if (!isProcessingSelectionRef.current) {
      if (streetInputRef.current && streetInputRef.current.value !== value.address_line_1) {
        streetInputRef.current.value = value.address_line_1;
      }
      setLocalAddressLine2(value.address_line_2);
      setLocalCity(value.city);
      setLocalState(value.state);
      setLocalZipCode(value.zip_code);
    }
  }, [value]);

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

  // Stable callback ref for onChange to avoid re-initializing autocomplete
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isLoaded || !streetInputRef.current) return;

    try {
      // Create a hidden div for PlacesService (it requires a DOM element)
      const serviceDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(serviceDiv);
      
      // Create Geocoder for fallback
      geocoderRef.current = new window.google.maps.Geocoder();

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        streetInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
        }
      );

      // Add custom styling for the Google Places dropdown
      const style = document.createElement('style');
      style.textContent = `
        .pac-container {
          z-index: 9999 !important;
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          margin-top: 4px !important;
        }
        .pac-item {
          padding: 12px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          cursor: pointer !important;
          background: white !important;
          pointer-events: auto !important;
        }
        .pac-item:hover {
          background: #f8fafc !important;
        }
        .pac-item:last-child {
          border-bottom: none !important;
        }
        .pac-matched {
          font-weight: 600 !important;
        }
      `;
      document.head.appendChild(style);

      // Helper function to process address components and call onChange
      const processAddressComponents = (components: google.maps.GeocoderAddressComponent[]) => {
        const addressData = parseAddressComponents(components, localAddressLine2);
        console.log('[StructuredAddressInput] Final address data:', addressData);
        
        // Set the processing flag to prevent external value sync from overwriting
        isProcessingSelectionRef.current = true;
        
        // Update the uncontrolled street input directly
        if (streetInputRef.current) {
          streetInputRef.current.value = addressData.address_line_1;
          console.log('[StructuredAddressInput] Set street input to:', addressData.address_line_1);
        }
        
        // Update local state for other fields
        setLocalAddressLine2(addressData.address_line_2);
        setLocalCity(addressData.city);
        setLocalState(addressData.state);
        setLocalZipCode(addressData.zip_code);
        
        // Call parent onChange with all the parsed data
        onChangeRef.current(addressData);
        
        // Reset processing flag after a short delay to allow React to settle
        setTimeout(() => {
          isProcessingSelectionRef.current = false;
        }, 300);
      };

      // Helper function to try Geocoder as fallback
      const tryGeocoderFallback = (placeId: string) => {
        console.log('[StructuredAddressInput] Trying Geocoder fallback for:', placeId);
        
        geocoderRef.current!.geocode({ placeId }, (results, status) => {
          console.log('[StructuredAddressInput] Geocoder response:', { status, hasResults: !!results?.length });
          
          if (status === 'OK' && results?.[0]?.address_components) {
            processAddressComponents(results[0].address_components);
          } else {
            console.error('[StructuredAddressInput] Geocoder fallback failed:', status);
            toast.error("Couldn't parse address. Please enter details manually.");
            isProcessingSelectionRef.current = false;
          }
        });
      };

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.place_id) {
          console.log('[StructuredAddressInput] No place or place_id returned');
          return;
        }

        console.log('[StructuredAddressInput] place_changed fired:', {
          placeId: place.place_id,
          hasAddressComponents: !!place.address_components,
          componentCount: place.address_components?.length
        });

        // Set processing flag immediately
        isProcessingSelectionRef.current = true;

        // Strategy 1: Try PlacesService.getDetails first (most reliable)
        placesServiceRef.current!.getDetails(
          {
            placeId: place.place_id,
            fields: ['address_components', 'formatted_address', 'geometry', 'name']
          },
          (details, status) => {
            console.log('[StructuredAddressInput] getDetails response:', { 
              status, 
              hasDetails: !!details,
              hasComponents: !!details?.address_components,
              componentCount: details?.address_components?.length
            });

            if (status === window.google.maps.places.PlacesServiceStatus.OK && 
                details?.address_components && 
                details.address_components.length > 0) {
              // Success with PlacesService
              processAddressComponents(details.address_components);
            } 
            // Strategy 2: Try Geocoder as fallback
            else {
              console.log('[StructuredAddressInput] getDetails incomplete, trying Geocoder fallback');
              tryGeocoderFallback(place.place_id!);
            }
          }
        );
      });

    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isLoaded]); // Only depend on isLoaded, use refs for callbacks

  // Handler for manual street address changes (when user types directly)
  const handleStreetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only update if not processing a selection
    if (!isProcessingSelectionRef.current) {
      onChangeRef.current({
        address_line_1: e.target.value,
        address_line_2: localAddressLine2,
        city: localCity,
        state: localState,
        zip_code: localZipCode
      });
    }
  }, [localAddressLine2, localCity, localState, localZipCode]);

  const handleFieldChange = (field: keyof StructuredAddressData, fieldValue: string) => {
    const updatedValue = {
      address_line_1: streetInputRef.current?.value || '',
      address_line_2: localAddressLine2,
      city: localCity,
      state: localState,
      zip_code: localZipCode,
      [field]: fieldValue
    };
    
    // Update local state
    if (field === 'address_line_2') setLocalAddressLine2(fieldValue);
    if (field === 'city') setLocalCity(fieldValue);
    if (field === 'state') setLocalState(fieldValue);
    if (field === 'zip_code') setLocalZipCode(fieldValue);
    
    onChange(updatedValue);
  };

  const handleStateSelect = (abbreviation: string) => {
    setLocalState(abbreviation);
    onChange({
      address_line_1: streetInputRef.current?.value || '',
      address_line_2: localAddressLine2,
      city: localCity,
      state: abbreviation,
      zip_code: localZipCode
    });
    setStateDropdownOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Street Address and Suite on same row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2 col-span-2">
          <Label htmlFor="address_line_1">Street Address</Label>
          <Input
            id="address_line_1"
            ref={streetInputRef}
            defaultValue={value.address_line_1}
            onChange={handleStreetChange}
            placeholder="Start typing address..."
            disabled={disabled}
            className="bg-background"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address_line_2">Suite/Apt</Label>
          <Input
            id="address_line_2"
            value={localAddressLine2}
            onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
            placeholder="Suite 100"
            disabled={disabled}
            className="bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={localCity}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="City"
            disabled={disabled}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label>State</Label>
          <Popover open={stateDropdownOpen} onOpenChange={setStateDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={stateDropdownOpen}
                className="w-full justify-between bg-background"
                disabled={disabled}
              >
                {selectedState ? selectedState.abbreviation : "Select..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search state..." />
                <CommandList>
                  <CommandEmpty>No state found.</CommandEmpty>
                  <CommandGroup>
                    {US_STATES.map((state) => (
                      <CommandItem
                        key={state.abbreviation}
                        value={`${state.name} ${state.abbreviation}`}
                        onSelect={() => handleStateSelect(state.abbreviation)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            localState === state.abbreviation ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {state.name} ({state.abbreviation})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip_code">Zip Code</Label>
          <Input
            id="zip_code"
            value={localZipCode}
            onChange={(e) => handleFieldChange('zip_code', e.target.value)}
            placeholder="12345"
            disabled={disabled}
            className="bg-background"
          />
        </div>
      </div>
    </div>
  );
}
