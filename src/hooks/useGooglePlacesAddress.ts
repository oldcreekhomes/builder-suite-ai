import { useState, useEffect, useRef, useCallback, RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

interface UseGooglePlacesAddressOptions {
  inputRef: RefObject<HTMLInputElement>;
  isActive: boolean;
  onPlaceSelected?: (address: AddressData) => void;
}

export function useGooglePlacesAddress({
  inputRef,
  isActive,
  onPlaceSelected,
}: UseGooglePlacesAddressOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteInitialized = useRef(false);
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  // Keep callback ref up to date
  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  // Fetch API key from edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fnError } = await supabase.functions.invoke('get-google-maps-key');
        
        if (fnError) {
          throw new Error(fnError.message || 'Failed to fetch API key');
        }
        
        if (data?.error) {
          throw new Error(data.error);
        }
        
        if (!data?.apiKey) {
          throw new Error('Google Maps API key not configured. Please add GOOGLE_MAPS_DISTANCE_MATRIX_KEY to your secrets.');
        }
        
        setApiKey(data.apiKey);
      } catch (err: any) {
        console.error('Failed to get Google Maps API key:', err);
        setError(err.message || 'Failed to load address search. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;

    const loadGoogleMapsScript = () => {
      // Check if already loaded
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setIsGoogleLoaded(true));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleLoaded(true);
      script.onerror = () => {
        setError('Failed to load Google Maps. Please check your API key.');
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [apiKey]);

  // Add autocomplete dropdown styles
  useEffect(() => {
    if (!document.getElementById('google-places-address-styles')) {
      const style = document.createElement('style');
      style.id = 'google-places-address-styles';
      style.textContent = `
        .pac-container {
          z-index: 999999 !important;
          border-radius: 8px !important;
          border: 1px solid hsl(var(--border)) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          background: hsl(var(--background)) !important;
          position: absolute !important;
          overflow: visible !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          cursor: pointer !important;
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          pointer-events: auto !important;
        }
        .pac-item:hover {
          background-color: hsl(var(--accent)) !important;
        }
        .pac-item-selected,
        .pac-item:active {
          background-color: hsl(var(--accent)) !important;
        }
        .pac-matched {
          font-weight: 600;
        }
        .pac-icon {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Parse address components from place result
  const parseAddressComponents = useCallback((place: google.maps.places.PlaceResult): AddressData | null => {
    if (!place.address_components || !place.geometry?.location) {
      console.log('Missing address_components or geometry:', { 
        hasComponents: !!place.address_components, 
        hasGeometry: !!place.geometry 
      });
      return null;
    }

    let streetNumber = "";
    let streetName = "";
    let city = "";
    let state = "";
    let zip = "";

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
          city = component.long_name;
          break;
        case "administrative_area_level_1":
          state = component.short_name;
          break;
        case "postal_code":
          zip = component.long_name;
          break;
      }
    }

    const street = streetNumber ? `${streetNumber} ${streetName}` : streetName;
    
    const lat = typeof place.geometry.location.lat === 'function' 
      ? place.geometry.location.lat() 
      : place.geometry.location.lat as unknown as number;
    const lng = typeof place.geometry.location.lng === 'function' 
      ? place.geometry.location.lng() 
      : place.geometry.location.lng as unknown as number;

    console.log('Parsed address:', { street, city, state, zip, lat, lng });

    return { street, city, state, zip, lat, lng };
  }, []);

  // Initialize autocomplete (mirrors useGooglePlaces.ts pattern exactly)
  const initializeAutocomplete = useCallback(() => {
    if (!isGoogleLoaded || !inputRef.current || !isActive) return;
    if (autocompleteInitialized.current && autocompleteRef.current) return;

    try {
      console.log('Initializing Google Places Autocomplete for address...');
      
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      // Create Geocoder for fallback
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create session token to bundle autocomplete + place details into single billing event
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

      // Create new autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry', 'place_id', 'formatted_address']
        }
      );
      
      // Set session token (not in types but supported by API)
      (autocompleteRef.current as any).setOptions({ sessionToken: sessionTokenRef.current });

      autocompleteInitialized.current = true;
      console.log('Google Places Autocomplete initialized for address');

      // Handle place selection - same pattern as useGooglePlaces.ts
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('place_changed event fired:', place);
        
        if (!place) {
          console.log('No place returned from getPlace()');
          return;
        }

        // Try direct parsing first
        if (place.address_components && place.geometry) {
          const addressData = parseAddressComponents(place);
          if (addressData && onPlaceSelectedRef.current) {
            console.log('Address parsed successfully:', addressData);
            onPlaceSelectedRef.current(addressData);
            
            // Create new session token for next search (session ends on place selection)
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            if (autocompleteRef.current) {
              (autocompleteRef.current as any).setOptions({ sessionToken: sessionTokenRef.current });
            }
            return;
          }
        }

        // Fallback: Use Geocoder if we have place_id but missing components
        if (place.place_id && geocoderRef.current) {
          console.log('Using Geocoder fallback for place_id:', place.place_id);
          geocoderRef.current.geocode({ placeId: place.place_id }, (results, status) => {
            console.log('Geocoder result:', status, results);
            if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
              const addressData = parseAddressComponents(results[0] as google.maps.places.PlaceResult);
              if (addressData && onPlaceSelectedRef.current) {
                console.log('Address parsed from Geocoder:', addressData);
                onPlaceSelectedRef.current(addressData);
                
                // Create new session token for next search
                sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
                if (autocompleteRef.current) {
                  (autocompleteRef.current as any).setOptions({ sessionToken: sessionTokenRef.current });
                }
              }
            } else {
              console.error('Geocoder failed:', status);
            }
          });
        }
      });

    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
    }
  }, [isGoogleLoaded, isActive, inputRef, parseAddressComponents]);

  // Initialize autocomplete when conditions are met (same timing as useGooglePlaces.ts)
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    let timer: NodeJS.Timeout;

    const tryInitialize = () => {
      if (inputRef.current && isGoogleLoaded && isActive) {
        initializeAutocomplete();
      } else if (attempts < maxAttempts && isActive && isGoogleLoaded) {
        attempts++;
        timer = setTimeout(tryInitialize, 150);
      }
    };

    timer = setTimeout(tryInitialize, 200);

    return () => clearTimeout(timer);
  }, [initializeAutocomplete, isActive, isGoogleLoaded]);

  // Cleanup when inactive
  useEffect(() => {
    if (!isActive) {
      autocompleteInitialized.current = false;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      geocoderRef.current = null;
    }
  }, [isActive]);

  return {
    isLoading,
    error,
    isGoogleLoaded,
  };
}
