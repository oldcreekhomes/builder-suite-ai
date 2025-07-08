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

// Generate mock weather data as fallback
function generateMockWeatherData() {
  const today = new Date();
  const weatherTypes = [
    { desc: 'Sunny', icon: '01d' },
    { desc: 'Partly Cloudy', icon: '02d' },
    { desc: 'Cloudy', icon: '04d' },
    { desc: 'Light Rain', icon: '10d' },
    { desc: 'Scattered Thunderstorms', icon: '11d' }
  ];

  return Array.from({ length: 10 }, (_, i) => {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const weather = weatherTypes[i % weatherTypes.length];
    const baseTemp = Math.floor(Math.random() * 20) + 70; // 70-90°F
    
    return {
      date: currentDate.toISOString().split('T')[0],
      highTemp: baseTemp + Math.floor(Math.random() * 10), // High temp
      lowTemp: baseTemp - Math.floor(Math.random() * 10), // Low temp
      description: weather.desc,
      icon: weather.icon,
      humidity: Math.floor(Math.random() * 40) + 30, // 30-70%
      windSpeed: `${Math.floor(Math.random() * 10) + 3} mph` // 3-13 mph
    };
  });
}

// Get coordinates for zip code using geocoding service
async function getCoordinatesForZipCode(zipCode: string) {
  console.log('Fetching coordinates for zip code:', zipCode);
  
  const geocodeResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${zipCode}&count=1&language=en&format=json`
  );
  
  const geocodeData = await geocodeResponse.json();
  console.log('Geocoding response:', geocodeData);
  
  if (!geocodeData || !geocodeData.results || geocodeData.results.length === 0) {
    console.log('No geocoding results found for zip code, using hardcoded Alexandria coordinates');
    // Fallback to hardcoded Alexandria, VA coordinates
    return {
      lat: 38.8048,
      lon: -77.0469,
      locationName: "Alexandria, Virginia"
    };
  }
  
  const { latitude: lat, longitude: lon, name: locationName } = geocodeData.results[0];
  return { lat, lon, locationName };
}

// Fetch NWS points data for coordinates
async function fetchNWSPointsData(lat: number, lon: number) {
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
    throw new Error(`NWS points API failed with status ${pointsResponse.status}`);
  }

  const pointsData = await pointsResponse.json();
  console.log('NWS points data:', pointsData);
  return pointsData.properties.forecast;
}

// Fetch weather data from NWS forecast URL
async function fetchWeatherData(forecastUrl: string) {
  console.log('Forecast URL:', forecastUrl);
  
  const weatherResponse = await fetch(forecastUrl, {
    headers: {
      'User-Agent': 'BuilderSuiteAI Weather App (contact@example.com)'
    }
  });

  console.log('Weather response status:', weatherResponse.status);
  
  if (!weatherResponse.ok) {
    throw new Error(`Weather API failed with status ${weatherResponse.status}`);
  }
  
  const weatherData = await weatherResponse.json();
  console.log('Weather data received');
  return weatherData;
}

// Get current date in Eastern time zone
function getEasternTimeDate() {
  const today = new Date();
  const easternTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(today);
  
  const year = parseInt(easternTime.find(part => part.type === 'year')?.value || '');
  const month = parseInt(easternTime.find(part => part.type === 'month')?.value || '') - 1; // Month is 0-indexed
  const day = parseInt(easternTime.find(part => part.type === 'day')?.value || '');
  
  return new Date(year, month, day);
}

// Process weather forecast data into daily forecasts
function processWeatherForecast(weatherData: any) {
  // Process NWS forecast data - NWS provides up to 14 periods (7 days, day/night)
  const nwsPeriods = weatherData.properties.periods;
  
  // Create 10 days of forecast - group day/night periods into daily forecasts
  const dailyForecasts = [];
  const localToday = getEasternTimeDate();
  
  for (let i = 0; i < 10; i++) {
    const currentDate = new Date(localToday);
    currentDate.setDate(localToday.getDate() + i);
    
    // Try to find day and night periods for this date
    const dayPeriod = nwsPeriods.find((p: any, idx: number) => 
      idx < nwsPeriods.length && p.isDaytime === true && idx <= i * 2
    );
    const nightPeriod = nwsPeriods.find((p: any, idx: number) => 
      idx < nwsPeriods.length && p.isDaytime === false && idx <= i * 2 + 1
    );
    
    let highTemp, lowTemp, description, windSpeed;
    
    if (dayPeriod || nightPeriod) {
      // Use NWS data if available
      if (dayPeriod && nightPeriod) {
        highTemp = Math.max(dayPeriod.temperature, nightPeriod.temperature);
        lowTemp = Math.min(dayPeriod.temperature, nightPeriod.temperature);
        description = dayPeriod.shortForecast;
        windSpeed = dayPeriod.windSpeed;
      } else if (dayPeriod) {
        highTemp = dayPeriod.temperature;
        lowTemp = dayPeriod.temperature - 15; // Estimate low temp
        description = dayPeriod.shortForecast;
        windSpeed = dayPeriod.windSpeed;
      } else {
        highTemp = nightPeriod.temperature + 15; // Estimate high temp
        lowTemp = nightPeriod.temperature;
        description = nightPeriod.shortForecast;
        windSpeed = nightPeriod.windSpeed;
      }
    } else {
      // Mock data for days beyond NWS forecast
      const baseTemp = Math.floor(Math.random() * 20) + 70;
      highTemp = baseTemp + Math.floor(Math.random() * 10);
      lowTemp = baseTemp - Math.floor(Math.random() * 10);
      description = i % 2 === 0 ? 'Partly Cloudy' : 'Sunny';
      windSpeed = `${Math.floor(Math.random() * 10) + 5} mph`;
    }
    
    // Format date as YYYY-MM-DD in local time
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    dailyForecasts.push({
      date: dateString,
      highTemp: Math.round(highTemp),
      lowTemp: Math.round(lowTemp),
      description: description,
      icon: mapNWSToIcon(description),
      humidity: 'N/A', // NWS doesn't provide humidity in basic forecast
      windSpeed: windSpeed || 'N/A'
    });
  }

  console.log('Processed forecasts:', dailyForecasts);
  return dailyForecasts;
}

// Create response with proper headers
function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  console.log('=== Weather Function Started ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing weather request...');
    const requestBody = await req.text();
    console.log('Raw request body:', requestBody);
    
    // For now, hardcode to zip code 22314 (Alexandria, VA) for all projects
    const zipCode = '22314';
    console.log('Using zip code:', zipCode);

    // Get coordinates for zip code
    const { lat, lon, locationName } = await getCoordinatesForZipCode(zipCode);
    console.log('Using coordinates:', { lat, lon, locationName });

    // Get NWS forecast URL
    let forecastUrl;
    try {
      forecastUrl = await fetchNWSPointsData(lat, lon);
    } catch (error) {
      console.log('NWS points error:', error, 'Using mock weather data as fallback');
      return createResponse({ 
        location: locationName,
        forecast: generateMockWeatherData()
      });
    }

    // Fetch weather data
    let weatherData;
    try {
      weatherData = await fetchWeatherData(forecastUrl);
    } catch (error) {
      console.log('Weather API failed, using mock data:', error);
      return createResponse({ 
        location: locationName,
        forecast: generateMockWeatherData()
      });
    }

    // Process forecast data
    const dailyForecasts = processWeatherForecast(weatherData);

    console.log('Successfully processed weather data, returning response...');
    const response = { 
      location: locationName,
      forecast: dailyForecasts 
    };
    console.log('Final response:', JSON.stringify(response, null, 2));

    return createResponse(response);

  } catch (error) {
    console.error('=== CRITICAL ERROR in weather function ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Return mock data as absolute fallback
    console.log('Returning mock data as absolute fallback...');
    return createResponse({ 
      location: "Alexandria, Virginia (Mock Data)",
      forecast: generateMockWeatherData()
    });
  }
});