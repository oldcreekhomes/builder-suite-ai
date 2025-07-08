import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map NWS weather descriptions to icon codes compatible with our UI
function mapNWSToIcon(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('sunny') || desc.includes('clear')) return '01d';
  if (desc.includes('partly cloudy') || desc.includes('few clouds')) return '02d';
  if (desc.includes('mostly cloudy') || desc.includes('scattered clouds')) return '03d';
  if (desc.includes('cloudy') || desc.includes('overcast')) return '04d';
  if (desc.includes('rain') || desc.includes('drizzle')) return '10d';
  if (desc.includes('thunderstorm') || desc.includes('storm')) return '11d';
  if (desc.includes('snow')) return '13d';
  if (desc.includes('fog') || desc.includes('mist')) return '50d';
  
  return '02d'; // Default to partly cloudy
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, get coordinates from the address using free geocoding service
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    );
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || !geocodeData.results || geocodeData.results.length === 0) {
      return new Response(JSON.stringify({ error: 'Address not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { latitude: lat, longitude: lon, name: locationName } = geocodeData.results[0];

    // Get NWS forecast office and grid coordinates
    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );

    if (!pointsResponse.ok) {
      return new Response(JSON.stringify({ error: 'Location not supported by National Weather Service' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pointsData = await pointsResponse.json();
    const forecastUrl = pointsData.properties.forecast;

    // Get the 7-day forecast from NWS
    const weatherResponse = await fetch(forecastUrl, {
      headers: {
        'User-Agent': 'BuilderSuiteAI Weather App (contact@example.com)'
      }
    });

    const weatherData = await weatherResponse.json();

    // Process NWS forecast data
    const dailyForecasts = weatherData.properties.periods.slice(0, 7).map((period: any) => {
      // Extract temperature (NWS provides as "85°F" format)
      const tempMatch = period.temperature;
      
      return {
        date: period.name,
        temperature: tempMatch,
        description: period.shortForecast,
        icon: mapNWSToIcon(period.shortForecast),
        humidity: 'N/A', // NWS doesn't provide humidity in basic forecast
        windSpeed: period.windSpeed || 'N/A'
      };
    });

    return new Response(JSON.stringify({ 
      location: locationName,
      forecast: dailyForecasts 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-weather-forecast function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});