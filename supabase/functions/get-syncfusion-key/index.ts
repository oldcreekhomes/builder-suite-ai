
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Getting Syncfusion license key from environment...')
    const licenseKey = Deno.env.get('SYNCFUSION_LICENSE_KEY')
    
    console.log('License key found:', !!licenseKey)
    console.log('License key length:', licenseKey ? licenseKey.length : 0)
    
    if (!licenseKey) {
      console.error('SYNCFUSION_LICENSE_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Syncfusion license key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    return new Response(
      JSON.stringify({ licenseKey }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in get-syncfusion-key function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
