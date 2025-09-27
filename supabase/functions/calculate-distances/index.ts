import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      throw new Error('Google Maps API key not configured')
    }

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

    // Batch companies for API efficiency (max 25 destinations per request)
    const batches = []
    const batchSize = 25
    
    for (let i = 0; i < companiesWithAddresses.length; i += batchSize) {
      batches.push(companiesWithAddresses.slice(i, i + batchSize))
    }

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
          results[companyId] = {
            companyId,
            distance: Math.round(distanceInMiles * 10) / 10 // Round to 1 decimal
          }
        } else {
          results[companyId] = {
            companyId,
            distance: null,
            error: element.status === 'ZERO_RESULTS' ? 'No route found' : 'Distance calculation failed'
          }
        }
      })
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
      JSON.stringify({ results }),
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