import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DistanceRequest {
  projectAddress: string;
  companies: Array<{
    id: string;
    address: string;
  }>;
}

interface DistanceResult {
  companyId: string;
  distance: number | null; // in miles
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectAddress, companies }: DistanceRequest = await req.json()
    
    if (!projectAddress || !companies?.length) {
      throw new Error('Missing project address or companies')
    }

    // Get Google Maps API key
    const apiKey = Deno.env.get('GOOGLE_MAPS_DISTANCE_MATRIX_KEY')
    if (!apiKey) {
      throw new Error('Google Maps Distance Matrix API key not configured')
    }

    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results: Record<string, DistanceResult> = {}

    // Filter companies that have addresses
    const companiesWithAddresses = companies.filter(
      company => company.address && company.address.trim() && company.address !== 'Unknown'
    )

    if (companiesWithAddresses.length === 0) {
      // Return results for companies without addresses
      companies.forEach(company => {
        results[company.id] = {
          companyId: company.id,
          distance: null,
          error: 'No address available'
        }
      })
      
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check cache for existing distances
    console.log(`Checking cache for ${companiesWithAddresses.length} companies...`)
    const { data: cachedDistances } = await supabase
      .from('marketplace_distance_cache')
      .select('company_id, distance_miles')
      .eq('origin_address', projectAddress)
      .in('company_id', companiesWithAddresses.map(c => c.id))

    const cachedCompanyIds = new Set<string>()
    if (cachedDistances && cachedDistances.length > 0) {
      console.log(`Found ${cachedDistances.length} cached distances`)
      cachedDistances.forEach(row => {
        cachedCompanyIds.add(row.company_id)
        results[row.company_id] = {
          companyId: row.company_id,
          distance: row.distance_miles
        }
      })
    }

    // Filter to only uncached companies
    const uncachedCompanies = companiesWithAddresses.filter(c => !cachedCompanyIds.has(c.id))
    
    if (uncachedCompanies.length === 0) {
      console.log('All distances were cached, no API calls needed')
      // Handle companies without addresses
      companies.forEach(company => {
        if (!company.address || !company.address.trim() || company.address === 'Unknown') {
          results[company.id] = {
            companyId: company.id,
            distance: null,
            error: 'No address available'
          }
        }
      })
      
      return new Response(
        JSON.stringify({ results, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Need to calculate distances for ${uncachedCompanies.length} companies via API`)

    // Batch companies for API efficiency (max 25 destinations per request)
    const batches = []
    const batchSize = 25
    
    for (let i = 0; i < uncachedCompanies.length; i += batchSize) {
      batches.push(uncachedCompanies.slice(i, i + batchSize))
    }

    const newDistances: Array<{ company_id: string; distance_miles: number | null; origin_address: string; origin_lat: number; origin_lng: number }> = []

    // Process each batch
    for (const batch of batches) {
      const destinations = batch.map(company => encodeURIComponent(company.address)).join('|')
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${encodeURIComponent(projectAddress)}&` +
        `destinations=${destinations}&` +
        `units=imperial&` +
        `mode=driving&` +
        `key=${apiKey}`
      )

      if (!response.ok) {
        console.error('Distance Matrix API request failed:', response.status, response.statusText)
        // Set error for all companies in this batch
        batch.forEach(company => {
          results[company.id] = {
            companyId: company.id,
            distance: null,
            error: 'Distance Matrix API request failed'
          }
        })
        continue
      }

      const data = await response.json()
      
      if (data.status !== 'OK') {
        console.error('Distance Matrix API error:', data.status, data.error_message)
        // Set error for all companies in this batch
        batch.forEach(company => {
          results[company.id] = {
            companyId: company.id,
            distance: null,
            error: `API error: ${data.status}`
          }
        })
        continue
      }

      // Process results for this batch
      data.rows[0]?.elements?.forEach((element: any, index: number) => {
        const company = batch[index]
        const companyId = company.id

        if (element.status === 'OK' && element.distance && element.distance.value) {
          // Convert meters to miles
          const distanceInMiles = element.distance.value * 0.000621371
          const roundedDistance = Math.round(distanceInMiles * 10) / 10 // Round to 1 decimal
          
          results[companyId] = {
            companyId,
            distance: roundedDistance
          }

          // Prepare for cache insertion (we'll use 0,0 for lat/lng since we're keying by address)
          newDistances.push({
            company_id: companyId,
            distance_miles: roundedDistance,
            origin_address: projectAddress,
            origin_lat: 0,
            origin_lng: 0
          })
        } else {
          results[companyId] = {
            companyId,
            distance: null,
            error: element.status === 'ZERO_RESULTS' ? 'No route found' : 'Distance calculation failed'
          }
        }
      })
    }

    // Cache the new distances
    if (newDistances.length > 0) {
      console.log(`Caching ${newDistances.length} new distances`)
      const { error: cacheError } = await supabase
        .from('marketplace_distance_cache')
        .upsert(newDistances, { 
          onConflict: 'origin_lat,origin_lng,company_id',
          ignoreDuplicates: true 
        })
      
      if (cacheError) {
        console.error('Failed to cache distances:', cacheError)
        // Don't fail the request, just log the error
      }
    }

    // Handle companies without addresses
    companies.forEach(company => {
      if (!company.address || !company.address.trim() || company.address === 'Unknown') {
        results[company.id] = {
          companyId: company.id,
          distance: null,
          error: 'No address available'
        }
      }
    })

    return new Response(
      JSON.stringify({ 
        results, 
        stats: {
          fromCache: cachedCompanyIds.size,
          fromApi: newDistances.length,
          total: Object.keys(results).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error calculating distances:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})