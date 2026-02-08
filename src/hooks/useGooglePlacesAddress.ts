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
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteInitialized = useRef(false);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const isProcessingRef = useRef(false);

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
      lat: typeof place.geometry.location.lat === 'function' 
        ? place.geometry.location.lat() 
        : place.geometry.location.lat as unknown as number,
      lng: typeof place.geometry.location.lng === 'function' 
        ? place.geometry.location.lng() 
        : place.geometry.location.lng as unknown as number,
    };
  }, []);

  // Process place with fallback chain: PlacesService -> Geocoder -> Direct parsing
  const processPlace = useCallback((place: google.maps.places.PlaceResult) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log('Processing place:', place);

    const handleAddressData = (addressData: AddressData | null) => {
      isProcessingRef.current = false;
      if (addressData && onPlaceSelectedRef.current) {
        console.log('Address data parsed:', addressData);
        onPlaceSelectedRef.current(addressData);
      }
    };

    // If we have a place_id, try PlacesService.getDetails() first for complete data
    if (place.place_id && placesServiceRef.current) {
      console.log('Trying PlacesService.getDetails()...');
      placesServiceRef.current.getDetails(
        { 
          placeId: place.place_id, 
          fields: ['address_components', 'geometry', 'formatted_address', 'name'] 
        },
        (details, status) => {
          console.log('PlacesService result:', status, details);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && details?.address_components) {
            const addressData = parseAddressComponents(details);
            if (addressData) {
              handleAddressData(addressData);
              return;
            }
          }
          
          // Fallback to Geocoder
          if (geocoderRef.current && place.place_id) {
            console.log('Falling back to Geocoder...');
            geocoderRef.current.geocode({ placeId: place.place_id }, (results, geoStatus) => {
              console.log('Geocoder result:', geoStatus, results);
              if (geoStatus === window.google.maps.GeocoderStatus.OK && results?.[0]) {
                const addressData = parseAddressComponents(results[0] as google.maps.places.PlaceResult);
                handleAddressData(addressData);
              } else {
                // Final fallback: try direct parsing
                const addressData = parseAddressComponents(place);
                handleAddressData(addressData);
              }
            });
          } else {
            // No geocoder, try direct parsing
            const addressData = parseAddressComponents(place);
            handleAddressData(addressData);
          }
        }
      );
    } else {
      // No place_id, try direct parsing
      const addressData = parseAddressComponents(place);
      handleAddressData(addressData);
    }
  }, [parseAddressComponents]);

  // Initialize autocomplete
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

      // Create PlacesService and Geocoder for fallbacks
      const serviceDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(serviceDiv);
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create new autocomplete instance for address search with expanded fields
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'geometry', 'place_id', 'formatted_address', 'name'],
        }
      );

      autocompleteInitialized.current = true;
      console.log('Google Places Autocomplete initialized');

      // Handle place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('place_changed event fired:', place);
        
        if (place) {
          processPlace(place);
        }
      });

    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
    }
  }, [isGoogleLoaded, isActive, inputRef, processPlace]);

  // Add document-level click handler for pac-items to bypass modal interference
  useEffect(() => {
    if (!isActive || !isGoogleLoaded) return;

    const handlePacItemClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const pacItem = target.closest('.pac-item');
      
      if (pacItem) {
        console.log('pac-item clicked, stopping propagation');
        // Stop the event from reaching modal handlers
        e.stopPropagation();
        
        // Small delay to let Google process the selection
        setTimeout(() => {
          const place = autocompleteRef.current?.getPlace();
          if (place && (place.address_components || place.place_id)) {
            console.log('Processing place after pac-item click:', place);
            processPlace(place);
          }
        }, 100);
      }
    };

    // Use capture phase to intercept before modal handlers
    document.addEventListener('mousedown', handlePacItemClick, true);
    document.addEventListener('pointerdown', handlePacItemClick, true);

    return () => {
      document.removeEventListener('mousedown', handlePacItemClick, true);
      document.removeEventListener('pointerdown', handlePacItemClick, true);
    };
  }, [isActive, isGoogleLoaded, processPlace]);

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
      isProcessingRef.current = false;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      placesServiceRef.current = null;
      geocoderRef.current = null;
    }
  }, [isActive]);

  return {
    isLoading,
    error,
    isGoogleLoaded,
  };
}
