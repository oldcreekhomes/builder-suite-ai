
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter address",
  disabled = false,
  id,
  className
}: AddressAutocompleteProps) {
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
        // Fallback to environment variable if function doesn't exist
        setApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);
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

      // Add custom styling for better visibility and z-index
      const addCustomStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
          .pac-container {
            z-index: 9999 !important;
            border-radius: 8px !important;
            border: 1px solid hsl(var(--border)) !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
            background-color: hsl(var(--background)) !important;
          }
          .pac-item {
            border-bottom: 1px solid hsl(var(--border)) !important;
            background-color: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
            padding: 8px 12px !important;
            cursor: pointer !important;
          }
          .pac-item:hover {
            background-color: hsl(var(--muted)) !important;
          }
          .pac-item-selected {
            background-color: hsl(var(--accent)) !important;
          }
          .pac-matched {
            font-weight: 600 !important;
            color: hsl(var(--primary)) !important;
          }
        `;
        if (!document.querySelector('[data-address-autocomplete-styles]')) {
          style.setAttribute('data-address-autocomplete-styles', 'true');
          document.head.appendChild(style);
        }
      };

      addCustomStyles();

      // Standard place_changed event
      autocompleteRef.current.addListener('place_changed', () => {
        console.log('AddressAutocomplete: place_changed event fired');
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          console.log('AddressAutocomplete: Selected address via place_changed:', place.formatted_address);
          onChange(place.formatted_address);
        }
      });

      // Add click handler for PAC items (Google Places suggestions)
      const handlePacItemClick = (event: Event) => {
        const target = event.target as HTMLElement;
        const pacItem = target.closest('.pac-item');
        
        if (pacItem) {
          console.log('AddressAutocomplete: PAC item clicked');
          
          // Small delay to allow Google's internal processing
          setTimeout(() => {
            const place = autocompleteRef.current?.getPlace();
            if (place && place.formatted_address) {
              console.log('AddressAutocomplete: Selected address via click:', place.formatted_address);
              onChange(place.formatted_address);
            } else {
              console.log('AddressAutocomplete: No place data after click, trying to extract from PAC item');
              // Fallback: try to get address from the PAC item text
              const addressText = pacItem.querySelector('.pac-item-query')?.textContent;
              if (addressText) {
                console.log('AddressAutocomplete: Using PAC item text:', addressText);
                onChange(addressText);
              }
            }
          }, 100);
        }
      };

      // Add event listener to document for PAC item clicks
      document.addEventListener('click', handlePacItemClick, true);

      // Store the cleanup function
      const cleanup = () => {
        document.removeEventListener('click', handlePacItemClick, true);
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };

      return cleanup;
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }
  }, [isLoaded, onChange]);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
