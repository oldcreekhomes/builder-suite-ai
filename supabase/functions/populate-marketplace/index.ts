import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Places API mapping - comprehensive 200+ company types
const GOOGLE_PLACES_MAPPING: Record<string, { type?: string; keyword?: string }> = {
  // ============ DESIGNERS ============
  "Architect": { keyword: "architect" },
  "Bath Designer": { keyword: "bathroom designer" },
  "Closet Designer": { keyword: "custom closet designer" },
  "Home Theater Designer": { keyword: "home theater design installation" },
  "Interior Designer": { keyword: "interior designer" },
  "Kitchen Designer": { keyword: "kitchen designer" },
  "Landscape Architect": { keyword: "landscape architect" },
  "Lighting Designer": { keyword: "lighting designer" },

  // ============ ENGINEERS ============
  "Civil Engineer": { keyword: "civil engineering firm" },
  "Electrical Engineer": { keyword: "electrical engineering firm" },
  "Environmental Engineer": { keyword: "environmental engineering consultant" },
  "Fire Protection Engineer": { keyword: "fire protection engineer" },
  "Geotechnical Engineer": { keyword: "geotechnical engineering" },
  "Mechanical Engineer": { keyword: "mechanical engineering firm" },
  "MEP Engineer": { keyword: "MEP engineering firm" },
  "Plumbing Engineer": { keyword: "plumbing engineering" },
  "Stormwater Engineer": { keyword: "stormwater management engineering" },
  "Structural Engineer": { keyword: "structural engineer" },
  "Transportation Engineer": { keyword: "transportation engineering" },

  // ============ EQUIPMENT SUPPLIERS ============
  "Crane Rental": { keyword: "crane rental" },
  "Dumpster Rental": { keyword: "dumpster rental" },
  "Equipment Rental": { keyword: "construction equipment rental" },
  "Generator Rental": { keyword: "generator rental" },
  "Heavy Equipment Rental": { keyword: "heavy equipment rental" },
  "Portable Toilet Rental": { keyword: "portable toilet rental construction" },
  "Scaffolding Rental": { keyword: "scaffolding rental" },
  "Tool Rental": { keyword: "tool rental" },

  // ============ EXTERIOR & LANDSCAPING ============
  "Deck Contractor": { keyword: "deck builder contractor" },
  "Driveway Contractor": { keyword: "driveway contractor" },
  "Exterior Painting Contractor": { keyword: "exterior house painter" },
  "Fence Contractor": { keyword: "fence contractor" },
  "Garage Door Installer": { keyword: "garage door installer" },
  "Gutter Contractor": { keyword: "gutter contractor" },
  "Irrigation Contractor": { keyword: "irrigation contractor" },
  "Landscaping Contractor": { keyword: "landscaping contractor" },
  "Lawn Care Service": { keyword: "lawn care service" },
  "Outdoor Living Contractor": { keyword: "outdoor living contractor patio" },
  "Patio Contractor": { keyword: "patio contractor" },
  "Paving Contractor": { keyword: "paving contractor" },
  "Pool/Spa Contractor": { keyword: "pool contractor" },
  "Pressure Washing Service": { keyword: "pressure washing service" },
  "Tree Service": { keyword: "tree service arborist" },
  "Window Cleaning Service": { keyword: "window cleaning service" },

  // ============ FINANCIAL SERVICES ============
  "Accountant/CPA": { keyword: "accountant CPA" },
  "Appraiser": { keyword: "real estate appraiser" },
  "Commercial Lender": { keyword: "commercial real estate lender" },
  "Construction Lender": { keyword: "construction loan lender" },
  "Financial Advisor": { keyword: "financial advisor" },
  "Insurance Agent": { type: "insurance_agency" },
  "Mortgage Lender": { keyword: "mortgage lender" },
  "Private Money Lender": { keyword: "private money lender hard money" },
  "Surety Bond Provider": { keyword: "surety bond" },
  "Tax Consultant": { keyword: "tax consultant" },
  "Title Company": { keyword: "title company" },

  // ============ GOVERNMENT & SERVICES ============
  "Arborist": { keyword: "certified arborist" },
  "Energy Auditor": { keyword: "home energy auditor" },
  "Home Inspector": { keyword: "home inspector" },
  "Home Warranty Provider": { keyword: "home warranty" },
  "Mold Inspector": { keyword: "mold inspector testing" },
  "Municipality/Permitting": { type: "local_government_office" },
  "Real Estate Agent": { type: "real_estate_agency" },
  "Termite Inspector": { keyword: "termite inspector pest control" },
  "Utility Company": { keyword: "utility company" },

  // ============ INTERIOR TRADES ============
  "Accent Wall Contractor": { keyword: "accent wall installation contractor" },
  "Built-In Cabinet Installer": { keyword: "built-in cabinet installation" },
  "Cabinet Installer": { keyword: "cabinet installation contractor" },
  "Cabinet Manufacturer": { keyword: "custom cabinet manufacturer" },
  "Carpet Installer": { keyword: "carpet installer" },
  "Closet System Installer": { keyword: "custom closet system installer" },
  "Countertop Fabricator": { keyword: "countertop fabricator" },
  "Countertop Installer": { keyword: "countertop installation" },
  "Decorative Painter/Faux Finisher": { keyword: "faux finish decorative painter" },
  "Door Installer": { keyword: "interior door installer" },
  "Drywall Contractor": { keyword: "drywall contractor" },
  "Finish Carpenter": { keyword: "finish carpenter trim" },
  "Flooring Contractor": { type: "flooring_contractor" },
  "Hardwood Flooring Installer": { keyword: "hardwood floor installation" },
  "Insulation Contractor": { keyword: "insulation contractor" },
  "Interior Trim Contractor": { keyword: "interior trim carpentry contractor" },
  "Millwork Installer": { keyword: "millwork installation" },
  "Painter": { type: "painter" },
  "Shiplap Installer": { keyword: "shiplap installation contractor" },
  "Spray Foam Contractor": { keyword: "spray foam insulation contractor" },
  "Stair Contractor": { keyword: "stair contractor builder" },
  "Tile Contractor": { keyword: "tile contractor" },
  "Vinyl/LVP Installer": { keyword: "luxury vinyl plank installer" },
  "Wallpaper Installer": { keyword: "wallpaper installer" },
  "Window Installer": { keyword: "window installer" },

  // ============ LEGAL SERVICES ============
  "Business Attorney": { keyword: "business attorney" },
  "Construction Attorney": { keyword: "construction lawyer" },
  "Contract Attorney": { keyword: "contract attorney" },
  "Environmental Attorney": { keyword: "environmental lawyer" },
  "HOA Attorney": { keyword: "HOA attorney homeowners association" },
  "Land Use Attorney": { keyword: "land use attorney zoning" },
  "Lien Attorney": { keyword: "mechanics lien attorney" },
  "Real Estate Attorney": { keyword: "real estate attorney" },
  "Title Attorney": { keyword: "title attorney" },
  "Zoning Attorney": { keyword: "zoning attorney" },

  // ============ MATERIAL SUPPLIERS ============
  "Brick & Stone Supplier": { keyword: "brick stone supplier masonry" },
  "Building Materials Supplier": { type: "hardware_store" },
  "Cabinet Supplier": { keyword: "cabinet supplier showroom" },
  "Concrete Supplier (Ready-Mix)": { keyword: "ready mix concrete supplier" },
  "Countertop Supplier": { keyword: "countertop supplier" },
  "Door & Window Supplier": { keyword: "door window supplier" },
  "Drywall Supplier": { keyword: "drywall supplier" },
  "Electrical Fixtures Supplier": { keyword: "electrical supply lighting fixtures" },
  "Flooring Supplier": { keyword: "flooring supplier" },
  "Hardware Supplier": { keyword: "hardware supplier" },
  "Insulation Supplier": { keyword: "insulation supplier" },
  "Lumber Yard": { keyword: "lumber yard" },
  "Millwork Supplier": { keyword: "millwork supplier" },
  "Paint Supplier": { keyword: "paint supplier store" },
  "Plumbing Fixtures Supplier": { keyword: "plumbing fixtures supplier" },
  "Roofing Materials Supplier": { keyword: "roofing materials supplier" },
  "Steel Supplier": { keyword: "steel supplier" },
  "Tile Supplier": { keyword: "tile supplier showroom" },

  // ============ MEP CONTRACTORS ============
  "Audio/Video Installer": { keyword: "audio video installer" },
  "Electrical Contractor": { type: "electrician" },
  "Fire Sprinkler Contractor": { keyword: "fire sprinkler contractor" },
  "Generator Installer": { keyword: "generator installer" },
  "HVAC Contractor": { keyword: "HVAC contractor" },
  "Low Voltage Contractor": { keyword: "low voltage contractor" },
  "Plumbing Contractor": { type: "plumber" },
  "Security System Installer": { keyword: "security system installer" },
  "Smart Home Installer": { keyword: "smart home installer automation" },
  "Solar/Renewable Energy Contractor": { keyword: "solar installer" },

  // ============ SITE WORK CONTRACTORS ============
  "Concrete Contractor": { keyword: "concrete contractor" },
  "Demolition Contractor": { keyword: "demolition contractor" },
  "Earthwork Contractor": { keyword: "earthwork contractor" },
  "Erosion Control Contractor": { keyword: "erosion control contractor" },
  "Excavation Contractor": { keyword: "excavation contractor" },
  "Foundation Contractor": { keyword: "foundation contractor" },
  "Grading Contractor": { keyword: "grading contractor" },
  "Land Clearing Contractor": { keyword: "land clearing contractor" },
  "Retaining Wall Contractor": { keyword: "retaining wall contractor" },
  "Septic System Installer": { keyword: "septic system installer" },
  "Storm Water Management Contractor": { keyword: "stormwater management contractor" },
  "Utility Contractor": { keyword: "utility contractor" },

  // ============ SPECIALTY CONTRACTORS ============
  "Brick Mason": { keyword: "brick mason" },
  "Chimney Contractor": { keyword: "chimney contractor" },
  "EIFS Contractor": { keyword: "EIFS stucco contractor" },
  "Elevator Installer": { keyword: "residential elevator installer" },
  "Fireplace Installer": { keyword: "fireplace installer" },
  "Glass/Mirror Contractor": { keyword: "glass mirror contractor" },
  "Home Automation Contractor": { keyword: "home automation contractor" },
  "Metal Railing Contractor": { keyword: "metal railing contractor" },
  "Shower Door Installer": { keyword: "shower door installer" },
  "Stone Mason": { keyword: "stone mason" },
  "Stucco Contractor": { keyword: "stucco contractor" },
  "Waterproofing Contractor": { keyword: "waterproofing contractor" },
  "Wrought Iron Contractor": { keyword: "wrought iron fabricator" },

  // ============ STRUCTURAL TRADES ============
  "Deck Framing Contractor": { keyword: "deck framing contractor" },
  "Floor Joist Installer": { keyword: "floor joist installer" },
  "Framing Contractor": { keyword: "framing contractor" },
  "Lumber Framing Contractor": { keyword: "lumber framing contractor" },
  "Masonry Contractor": { keyword: "masonry contractor" },
  "Post-Frame Builder": { keyword: "post frame builder pole barn" },
  "Roofing Contractor": { type: "roofing_contractor" },
  "Siding Contractor": { keyword: "siding contractor" },
  "Steel Fabricator": { keyword: "steel fabricator" },
  "Timber Frame Builder": { keyword: "timber frame builder" },
  "Truss Manufacturer": { keyword: "truss manufacturer" },
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

interface SearchResponse {
  results: PlaceResult[];
  next_page_token?: string;
  status: string;
  error_message?: string;
}

interface PopulateRequest {
  categories?: string[];
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  targetPerCategory?: number;
  minRating?: number;
}

interface CategoryCount {
  company_type: string;
  count: number;
}

async function getExistingCounts(supabase: ReturnType<typeof createClient>): Promise<Map<string, number>> {
  console.log('Fetching existing category counts...');
  
  const { data, error } = await supabase
    .from('marketplace_companies')
    .select('company_type')
    .eq('source', 'google_places');
  
  if (error) {
    console.error('Error fetching existing counts:', error);
    return new Map();
  }
  
  const counts = new Map<string, number>();
  for (const row of data || []) {
    const type = row.company_type;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  
  console.log(`Found ${counts.size} existing categories with data`);
  return counts;
}

async function searchNearbyPlaces(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  mapping: { type?: string; keyword?: string },
  pageToken?: string | null
): Promise<SearchResponse> {
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(Math.min(radius, 50000)),
    key: apiKey,
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  } else {
    if (mapping.type) {
      params.set('type', mapping.type);
    }
    if (mapping.keyword) {
      params.set('keyword', mapping.keyword);
    }
  }

  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Searching: ${url.replace(apiKey, 'API_KEY')}`);

  const response = await fetch(url);
  const data = await response.json();

  return {
    results: data.results || [],
    next_page_token: data.next_page_token,
    status: data.status,
    error_message: data.error_message,
  };
}

async function searchNearbyPlacesWithPagination(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  mapping: { type?: string; keyword?: string },
  maxResults: number
): Promise<PlaceResult[]> {
  let allResults: PlaceResult[] = [];
  let nextPageToken: string | null = null;
  let attempts = 0;
  const maxAttempts = 3; // Max 3 pages (60 results)

  do {
    const response = await searchNearbyPlaces(apiKey, lat, lng, radius, mapping, nextPageToken);
    
    if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
      console.error(`Google Places API error: ${response.status}`, response.error_message);
      break;
    }

    allResults = [...allResults, ...response.results];
    nextPageToken = response.next_page_token || null;
    attempts++;

    console.log(`Page ${attempts}: Got ${response.results.length} results, total: ${allResults.length}`);

    if (allResults.length >= maxResults) break;
    if (nextPageToken && attempts < maxAttempts) {
      // Google requires a short delay before using next_page_token
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } while (nextPageToken && attempts < maxAttempts);

  return allResults;
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
      radiusMeters = 50000,
      targetPerCategory = 10,
      minRating = 3.5,
    } = body;

    console.log(`Starting SMART marketplace population for ${categories.length} categories`);
    console.log(`Center: ${centerLat}, ${centerLng}, Radius: ${radiusMeters}m`);
    console.log(`Target per category: ${targetPerCategory}, Min rating: ${minRating}`);

    // Get existing counts for smart fill
    const existingCounts = await getExistingCounts(supabase);

    const results: {
      category: string;
      existingCount: number;
      needed: number;
      added: number;
      skipped: number;
      errors: string[];
    }[] = [];

    let totalSkippedCategories = 0;

    // Process each category
    for (const category of categories) {
      const mapping = GOOGLE_PLACES_MAPPING[category];
      if (!mapping) {
        console.log(`No mapping found for category: ${category}`);
        results.push({ 
          category, 
          existingCount: 0, 
          needed: targetPerCategory, 
          added: 0, 
          skipped: 0, 
          errors: [`No mapping for ${category}`] 
        });
        continue;
      }

      // Check existing count
      const existingCount = existingCounts.get(category) || 0;
      const needed = Math.max(0, targetPerCategory - existingCount);

      if (needed === 0) {
        console.log(`Skipping ${category}: already has ${existingCount} companies (>= ${targetPerCategory})`);
        totalSkippedCategories++;
        results.push({ 
          category, 
          existingCount, 
          needed: 0, 
          added: 0, 
          skipped: existingCount, 
          errors: [] 
        });
        continue;
      }

      console.log(`Processing ${category}: has ${existingCount}, needs ${needed} more`);
      const categoryResult = { 
        category, 
        existingCount, 
        needed, 
        added: 0, 
        skipped: 0, 
        errors: [] as string[] 
      };

      try {
        // Search for places with pagination to get more results
        const places = await searchNearbyPlacesWithPagination(
          googleApiKey,
          centerLat,
          centerLng,
          radiusMeters,
          mapping,
          needed + 10 // Get extra to account for filtering/duplicates
        );

        console.log(`Found ${places.length} places for ${category}`);

        // Filter by rating and limit to what we need
        const filteredPlaces = places
          .filter(p => (p.rating || 0) >= minRating)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, needed + 5);

        console.log(`Filtered to ${filteredPlaces.length} places with rating >= ${minRating}`);

        // Get details and insert each place
        for (const place of filteredPlaces) {
          if (categoryResult.added >= needed) {
            console.log(`Reached target of ${needed} for ${category}`);
            break;
          }

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
              });

            if (insertError) {
              console.error(`Insert error for ${companyName}:`, insertError);
              categoryResult.errors.push(`Insert failed for ${companyName}: ${insertError.message}`);
            } else {
              console.log(`Added: ${companyName} (${category})`);
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
    const categoriesNeedingData = results.filter(r => r.needed > 0).length;

    console.log(`Population complete: ${totalAdded} added, ${totalSkipped} skipped, ${totalErrors} errors`);
    console.log(`Categories skipped (already full): ${totalSkippedCategories}`);
    console.log(`Categories that needed data: ${categoriesNeedingData}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalAdded,
          totalSkipped,
          totalErrors,
          categoriesProcessed: results.length,
          categoriesSkipped: totalSkippedCategories,
          categoriesNeedingData,
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
