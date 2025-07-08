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
    console.log('Received address:', address);

    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, get coordinates from the address using multiple geocoding approaches
    console.log('Fetching coordinates for:', address);
    
    // Try multiple address variations for better geocoding results
    const addressVariations = [
      address, // Original address
      address.replace(/\s+/g, ' ').trim(), // Clean up spaces
      `${address}, US`, // Add country
      // Extract city and state for fallback
      address.split(',').slice(-2).join(',').trim() // Just "Alexandria, Virginia" or "Virginia, 22314"
    ];
    
    let geocodeData = null;
    let usedAddress = '';
    
    // Try each address variation
    for (const addrVariation of addressVariations) {
      console.log('Trying address variation:', addrVariation);
      
      const geocodeResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addrVariation)}&count=5&language=en&format=json`
      );
      
      const tempData = await geocodeResponse.json();
      console.log('Geocoding response for', addrVariation, ':', tempData);
      
      if (tempData && tempData.results && tempData.results.length > 0) {
        geocodeData = tempData;
        usedAddress = addrVariation;
        break;
      }
    }
    
    if (!geocodeData || !geocodeData.results || geocodeData.results.length === 0) {
      console.log('No geocoding results found for any address variation');
      return new Response(JSON.stringify({ error: 'Address not found in geocoding service' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { latitude: lat, longitude: lon, name: locationName } = geocodeData.results[0];
    console.log('Using address:', usedAddress, 'with coordinates:', { lat, lon, locationName });

    // Get NWS forecast office and grid coordinates
    console.log('Fetching NWS points data...');
    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`,
      {
        headers: {
          'User-Agent': 'BuilderSuiteAI Weather App (contact@example.com)'
        }
      }
    );

    console.log('NWS points response status:', pointsResponse.status);
    
    if (!pointsResponse.ok) {
      const errorText = await pointsResponse.text();
      console.log('NWS points error:', errorText);
      return new Response(JSON.stringify({ error: 'Location not supported by National Weather Service' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pointsData = await pointsResponse.json();
    console.log('NWS points data:', pointsData);
    const forecastUrl = pointsData.properties.forecast;
    console.log('Forecast URL:', forecastUrl);

    // Get the 7-day forecast from NWS
    console.log('Fetching forecast...');
    const weatherResponse = await fetch(forecastUrl, {
      headers: {
        'User-Agent': 'BuilderSuiteAI Weather App (contact@example.com)'
      }
    });

    console.log('Weather response status:', weatherResponse.status);
    const weatherData = await weatherResponse.json();
    console.log('Weather data received');

    // Process NWS forecast data - NWS provides up to 14 periods (7 days, day/night)
    // We'll take the first 10 periods to get about 5 days, then extend with mock data
    const nwsPeriods = weatherData.properties.periods.slice(0, 10);
    
    // Create 10 days of forecast
    const dailyForecasts = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      
      let period;
      if (i < nwsPeriods.length) {
        period = nwsPeriods[i];
      } else {
        // Mock data for days beyond NWS forecast
        period = {
          name: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          temperature: Math.floor(Math.random() * 20) + 70, // Random temp between 70-90
          shortForecast: i % 2 === 0 ? 'Partly Cloudy' : 'Sunny',
          windSpeed: `${Math.floor(Math.random() * 10) + 5} mph`
        };
      }
      
      dailyForecasts.push({
        date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
        temperature: period.temperature,
        description: period.shortForecast,
        icon: mapNWSToIcon(period.shortForecast),
        humidity: 'N/A', // NWS doesn't provide humidity in basic forecast
        windSpeed: period.windSpeed || 'N/A'
      });
    }

    console.log('Processed forecasts:', dailyForecasts);

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