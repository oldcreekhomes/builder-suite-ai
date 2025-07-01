
import { useState, useRef, useEffect } from "react";
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

  // Load Google Maps API key
  useEffect(() => {
    const getApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) throw error;
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Failed to get Google Maps API key:', error);
        setApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);
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

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isGoogleLoaded || !companyNameRef.current || !open) return;

    // Add custom CSS for autocomplete dropdown with higher z-index
    const addAutocompleteStyles = () => {
      if (!document.getElementById('google-autocomplete-styles')) {
        const style = document.createElement('style');
        style.id = 'google-autocomplete-styles';
        style.textContent = `
          .pac-container {
            z-index: 99999 !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            background: white !important;
          }
          .pac-item {
            padding: 8px 12px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            cursor: pointer !important;
            background: white !important;
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
    };

    addAutocompleteStyles();

    try {
      // Clear any existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        companyNameRef.current,
        {
          types: ['establishment'],
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'business_status', 'types']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('Place selected:', place);
        
        if (place && place.name) {
          setIsLoadingGoogleData(true);
          onPlaceSelected(place);
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

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleLoaded, open, onPlaceSelected]);

  return {
    companyNameRef,
    isGoogleLoaded,
    isLoadingGoogleData
  };
}
