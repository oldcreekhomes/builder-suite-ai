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

  // Parse address components from place
  const parseAddressComponents = useCallback((place: google.maps.places.PlaceResult): AddressData | null => {
    if (!place.address_components || !place.geometry?.location) {
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

    return {
      street,
      city,
      state,
      zip,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
  }, []);

  // Initialize autocomplete
  const initializeAutocomplete = useCallback(() => {
    if (!isGoogleLoaded || !inputRef.current || !isActive) return;
    if (autocompleteInitialized.current && autocompleteRef.current) return;

    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      // Create new autocomplete instance for address search
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry'],
        }
      );

      autocompleteInitialized.current = true;

      // Handle place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place) {
          const addressData = parseAddressComponents(place);
          if (addressData && onPlaceSelectedRef.current) {
            onPlaceSelectedRef.current(addressData);
          }
        }
      });

    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
    }
  }, [isGoogleLoaded, isActive, inputRef, parseAddressComponents]);

  // Initialize autocomplete when conditions are met
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
    }
  }, [isActive]);

  return {
    isLoading,
    error,
    isGoogleLoaded,
  };
}
