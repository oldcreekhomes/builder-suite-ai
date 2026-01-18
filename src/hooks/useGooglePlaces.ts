
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google: typeof google;
  }
}

export function useGooglePlaces(open: boolean, onPlaceSelected: (place: any) => void) {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLoadingGoogleData, setIsLoadingGoogleData] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const autocompleteInitialized = useRef(false);

  // Keep the callback ref up to date without causing re-renders
  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  // Load Google Maps API key
  useEffect(() => {
    const getApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) throw error;
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Failed to get Google Maps API key:', error);
        setApiKey(import.meta.env.VITE_GOOGLE_MAPS_DISTANCE_MATRIX_KEY || null);
      }
    };

    getApiKey();
  }, []);

  // Load Google Places API
  useEffect(() => {
    if (!apiKey) return;

    const loadGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleLoaded(true);
      script.onerror = () => console.error('Failed to load Google Places API');
      document.head.appendChild(script);
    };

    loadGooglePlaces();
  }, [apiKey]);

  // Add custom CSS for autocomplete dropdown
  useEffect(() => {
    if (!document.getElementById('google-autocomplete-styles')) {
      const style = document.createElement('style');
      style.id = 'google-autocomplete-styles';
      style.textContent = `
        .pac-container {
          z-index: 999999 !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          background: white !important;
          position: absolute !important;
          overflow: visible !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          cursor: pointer !important;
          background: white !important;
          position: relative !important;
          z-index: 999999 !important;
          pointer-events: auto !important;
        }
        .pac-item:hover {
          background-color: #f8fafc !important;
        }
        .pac-item-selected,
        .pac-item:active {
          background-color: #e2e8f0 !important;
        }
        .pac-matched {
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize or reinitialize autocomplete when ref changes
  const initializeAutocomplete = useCallback(() => {
    if (!isGoogleLoaded || !companyNameRef.current || !open) return;

    // Don't reinitialize if already initialized on the same element
    if (autocompleteInitialized.current && autocompleteRef.current) {
      return;
    }

    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      // Create new autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        companyNameRef.current,
        {
          types: ['establishment'],
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'business_status', 'types', 'address_components']
        }
      );

      console.log('Google Places Autocomplete initialized');
      autocompleteInitialized.current = true;

      // Add event listener for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('Place changed event triggered:', place);
        
        if (place && place.name) {
          console.log('Valid place selected, processing...', place.name);
          setIsLoadingGoogleData(true);
          
          onPlaceSelectedRef.current(place);
          setIsLoadingGoogleData(false);
          
          toast({
            title: "Success",
            description: "Company information loaded from Google Places",
          });
        }
      });

    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isGoogleLoaded, open]);

  // Initialize autocomplete when conditions are met
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;
    let timer: NodeJS.Timeout;
    
    const tryInitialize = () => {
      if (companyNameRef.current && isGoogleLoaded && open) {
        initializeAutocomplete();
      } else if (attempts < maxAttempts && open && isGoogleLoaded) {
        attempts++;
        timer = setTimeout(tryInitialize, 150);
      }
    };
    
    // Initial delay to ensure the component is mounted (especially in tabs)
    timer = setTimeout(tryInitialize, 200);

    return () => clearTimeout(timer);
  }, [initializeAutocomplete, open, isGoogleLoaded]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      autocompleteInitialized.current = false;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    }
  }, [open]);


  return {
    companyNameRef,
    isGoogleLoaded,
    isLoadingGoogleData
  };
}
