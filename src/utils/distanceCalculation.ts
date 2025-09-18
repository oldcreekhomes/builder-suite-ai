import { supabase } from "@/integrations/supabase/client";

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodeCache {
  [address: string]: Coordinates | null;
}

// Cache geocoded addresses in session storage
const GEOCODE_CACHE_KEY = 'geocodeCache';

class DistanceCalculator {
  private cache: GeocodeCache = {};
  private apiKey: string | null = null;

  constructor() {
    this.loadCache();
    this.loadApiKey();
  }

  private loadCache() {
    try {
      const cached = sessionStorage.getItem(GEOCODE_CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load geocode cache:', error);
    }
  }

  private saveCache() {
    try {
      sessionStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save geocode cache:', error);
    }
  }

  private async loadApiKey() {
    try {
      const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      if (error) throw error;
      this.apiKey = data.apiKey;
    } catch (error) {
      console.error('Failed to get Google Maps API key:', error);
      this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
    }
  }

  private async geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address) return null;

    // Check cache first
    if (address in this.cache) {
      return this.cache[address];
    }

    if (!this.apiKey) {
      console.warn('Google Maps API key not available for geocoding');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const coordinates = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng
        };
        
        this.cache[address] = coordinates;
        this.saveCache();
        return coordinates;
      } else {
        console.warn('Geocoding failed for address:', address, data.status);
        this.cache[address] = null;
        this.saveCache();
        return null;
      }
    } catch (error) {
      console.error('Error geocoding address:', address, error);
      this.cache[address] = null;
      this.saveCache();
      return null;
    }
  }

  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 3959; // Radius of Earth in miles
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    const lat1 = this.toRad(coord1.lat);
    const lat2 = this.toRad(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  async calculateDistancesBetweenAddresses(
    projectAddress: string,
    companyAddresses: { id: string; address: string }[]
  ): Promise<{ id: string; distance: number | null }[]> {
    if (!projectAddress) {
      return companyAddresses.map(company => ({ id: company.id, distance: null }));
    }

    // Geocode project address
    const projectCoords = await this.geocodeAddress(projectAddress);
    if (!projectCoords) {
      return companyAddresses.map(company => ({ id: company.id, distance: null }));
    }

    // Calculate distances for all companies
    const results = await Promise.all(
      companyAddresses.map(async company => {
        if (!company.address) {
          return { id: company.id, distance: null };
        }

        const companyCoords = await this.geocodeAddress(company.address);
        if (!companyCoords) {
          return { id: company.id, distance: null };
        }

        const distance = this.calculateDistance(projectCoords, companyCoords);
        return { id: company.id, distance };
      })
    );

    return results;
  }
}

export const distanceCalculator = new DistanceCalculator();