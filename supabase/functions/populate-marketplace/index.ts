import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Places API mapping (duplicated here for edge function)
const GOOGLE_PLACES_MAPPING: Record<string, { type?: string; keyword?: string }> = {
  // Financial & Legal Services
  "Accountant/CPA": { keyword: "accountant CPA" },
  "Appraiser": { keyword: "real estate appraiser" },
  "Attorney/Legal Services": { type: "lawyer" },
  "Construction Lender": { keyword: "construction loan lender" },
  "Mortgage Lender": { keyword: "mortgage lender" },
  "Insurance Agent": { type: "insurance_agency" },
  "Surety Bond Provider": { keyword: "surety bond" },
  "Title Company": { keyword: "title company" },
  
  // Design & Engineering
  "Architect": { keyword: "architect" },
  "Civil Engineer": { keyword: "civil engineering firm" },
  "Geotechnical Engineer": { keyword: "geotechnical engineering" },
  "Interior Designer": { keyword: "interior designer" },
  "Landscape Architect": { keyword: "landscape architect" },
  "Land Surveyor": { keyword: "land surveyor" },
  "MEP Engineer": { keyword: "mechanical electrical plumbing engineer" },
  "Structural Engineer": { keyword: "structural engineer" },
  
  // Site Work & Foundation
  "Concrete Contractor": { keyword: "concrete contractor" },
  "Demolition Contractor": { keyword: "demolition contractor" },
  "Excavation Contractor": { keyword: "excavation contractor" },
  "Foundation Contractor": { keyword: "foundation contractor" },
  "Grading Contractor": { keyword: "grading contractor" },
  "Paving Contractor": { keyword: "paving contractor" },
  "Septic System Installer": { keyword: "septic system installer" },
  "Utility Contractor": { keyword: "utility contractor" },
  
  // Structural Trades
  "Framing Contractor": { keyword: "framing contractor" },
  "Masonry Contractor": { keyword: "masonry contractor" },
  "Roofing Contractor": { type: "roofing_contractor" },
  "Siding Contractor": { keyword: "siding contractor" },
  "Steel Fabricator": { keyword: "steel fabricator" },
  "Truss Manufacturer": { keyword: "truss manufacturer" },
  
  // Mechanical Systems
  "Electrical Contractor": { type: "electrician" },
  "Fire Protection/Sprinkler": { keyword: "fire sprinkler contractor" },
  "HVAC Contractor": { keyword: "HVAC contractor" },
  "Plumbing Contractor": { type: "plumber" },
  "Solar/Renewable Energy": { keyword: "solar installer" },
  "Low Voltage/Security": { keyword: "security system installer" },
  
  // Interior Trades
  "Cabinet Maker": { keyword: "cabinet maker" },
  "Countertop Fabricator": { keyword: "countertop fabricator" },
  "Drywall Contractor": { keyword: "drywall contractor" },
  "Flooring Contractor": { type: "flooring_contractor" },
  "Insulation Contractor": { keyword: "insulation contractor" },
  "Painter": { type: "painter" },
  "Tile Contractor": { keyword: "tile contractor" },
  "Window/Door Installer": { keyword: "window door installer" },
  
  // Exterior & Landscaping
  "Deck/Fence Contractor": { keyword: "deck fence contractor" },
  "Garage Door Installer": { keyword: "garage door installer" },
  "Gutter Contractor": { keyword: "gutter contractor" },
  "Landscaping Contractor": { keyword: "landscaper" },
  "Pool/Spa Contractor": { keyword: "pool contractor" },
  "Irrigation Contractor": { keyword: "irrigation contractor" },
  
  // Materials & Equipment
  "Building Materials Supplier": { type: "hardware_store" },
  "Equipment Rental": { keyword: "equipment rental" },
  "Fixture Supplier": { keyword: "plumbing fixtures supplier" },
  "Lumber Yard": { keyword: "lumber yard" },
  "Ready-Mix Concrete": { keyword: "ready mix concrete" },
  
  // Government & Other
  "Municipality/Permitting": { type: "local_government_office" },
  "Utility Company": { keyword: "utility company" },
  "Home Warranty Provider": { keyword: "home warranty" },
  "Real Estate Agent": { type: "real_estate_agency" },
};

// Washington D.C. coordinates
const DC_CENTER = { lat: 38.9072, lng: -77.0369 };

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  website?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
}

interface PopulateRequest {
  categories?: string[];
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  maxResultsPerCategory?: number;
  minRating?: number;
}

async function searchNearbyPlaces(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  mapping: { type?: string; keyword?: string }
): Promise<PlaceResult[]> {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(Math.min(radius, 50000)), // Max 50km per Google
    key: apiKey,
  });

  if (mapping.type) {
    params.set('type', mapping.type);
  }
  if (mapping.keyword) {
    params.set('keyword', mapping.keyword);
  }

  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Searching: ${url.replace(apiKey, 'API_KEY')}`);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`Google Places API error: ${data.status}`, data.error_message);
    return [];
  }

  return data.results || [];
}

async function getPlaceDetails(apiKey: string, placeId: string): Promise<PlaceResult | null> {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,geometry',
    key: apiKey,
  });

  const url = `${baseUrl}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    console.error(`Place Details error for ${placeId}: ${data.status}`);
    return null;
  }

  return data.result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get API key from environment
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_DISTANCE_MATRIX_KEY');
    if (!googleApiKey) {
      throw new Error('GOOGLE_MAPS_DISTANCE_MATRIX_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: PopulateRequest = await req.json().catch(() => ({}));
    const {
      categories = Object.keys(GOOGLE_PLACES_MAPPING),
      centerLat = DC_CENTER.lat,
      centerLng = DC_CENTER.lng,
      radiusMeters = 50000, // Default to max single search radius
      maxResultsPerCategory = 5,
      minRating = 4.0,
    } = body;

    console.log(`Starting marketplace population for ${categories.length} categories`);
    console.log(`Center: ${centerLat}, ${centerLng}, Radius: ${radiusMeters}m`);

    const results: {
      category: string;
      added: number;
      skipped: number;
      errors: string[];
    }[] = [];

    // Process each category
    for (const category of categories) {
      const mapping = GOOGLE_PLACES_MAPPING[category];
      if (!mapping) {
        console.log(`No mapping found for category: ${category}`);
        results.push({ category, added: 0, skipped: 0, errors: [`No mapping for ${category}`] });
        continue;
      }

      console.log(`Processing category: ${category}`);
      const categoryResult = { category, added: 0, skipped: 0, errors: [] as string[] };

      try {
        // Search for places
        const places = await searchNearbyPlaces(
          googleApiKey,
          centerLat,
          centerLng,
          radiusMeters,
          mapping
        );

        console.log(`Found ${places.length} places for ${category}`);

        // Filter by rating and limit results
        const filteredPlaces = places
          .filter(p => (p.rating || 0) >= minRating)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, maxResultsPerCategory);

        console.log(`Filtered to ${filteredPlaces.length} places with rating >= ${minRating}`);

        // Get details and insert each place
        for (const place of filteredPlaces) {
          try {
            // Get additional details
            const details = await getPlaceDetails(googleApiKey, place.place_id);
            if (!details) {
              categoryResult.errors.push(`Failed to get details for ${place.name}`);
              continue;
            }

            const companyName = details.name;
            const address = details.formatted_address || place.vicinity || '';

            // Check for existing company with same name and address
            const { data: existing } = await supabase
              .from('marketplace_companies')
              .select('id')
              .eq('company_name', companyName)
              .eq('address', address)
              .maybeSingle();

            if (existing) {
              console.log(`Skipping duplicate: ${companyName}`);
              categoryResult.skipped++;
              continue;
            }

            // Insert new company
            const { error: insertError } = await supabase
              .from('marketplace_companies')
              .insert({
                company_name: companyName,
                company_type: category,
                address: address,
                phone_number: details.formatted_phone_number || null,
                website: details.website || null,
                rating: details.rating || null,
                review_count: details.user_ratings_total || null,
                source: 'google_places',
                // Set default values for required fields
                contact_email: null,
                contact_name: null,
                description: null,
              });

            if (insertError) {
              console.error(`Insert error for ${companyName}:`, insertError);
              categoryResult.errors.push(`Insert failed for ${companyName}: ${insertError.message}`);
            } else {
              console.log(`Added: ${companyName}`);
              categoryResult.added++;
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (placeError) {
            console.error(`Error processing place:`, placeError);
            categoryResult.errors.push(`Error: ${placeError instanceof Error ? placeError.message : 'Unknown error'}`);
          }
        }
      } catch (categoryError) {
        console.error(`Error processing category ${category}:`, categoryError);
        categoryResult.errors.push(`Category error: ${categoryError instanceof Error ? categoryError.message : 'Unknown error'}`);
      }

      results.push(categoryResult);

      // Add delay between categories to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calculate totals
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Population complete: ${totalAdded} added, ${totalSkipped} skipped, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalAdded,
          totalSkipped,
          totalErrors,
          categoriesProcessed: results.length,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Population error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
