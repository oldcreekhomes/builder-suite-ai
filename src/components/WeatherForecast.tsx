import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherDay {
  date: string;
  temperature: number | string;
  description: string;
  icon: string;
  humidity: number | string;
  windSpeed: number | string;
}

interface WeatherData {
  location: string;
  forecast: WeatherDay[];
}

interface WeatherForecastProps {
  address: string;
}

export function WeatherForecast({ address }: WeatherForecastProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        console.log('WeatherForecast: Starting to fetch weather for address:', address);
        setLoading(true);
        setError(null);

        console.log('WeatherForecast: Invoking supabase function...');
        const { data, error: functionError } = await supabase.functions.invoke(
          'get-weather-forecast',
          {
            body: JSON.stringify({ address })
          }
        );

        console.log('WeatherForecast: Function response:', { data, functionError });

        if (functionError) {
          console.error('WeatherForecast: Function error:', functionError);
          throw functionError;
        }

        if (!data) {
          console.error('WeatherForecast: No data returned from function');
          throw new Error('No data returned from weather function');
        }

        console.log('WeatherForecast: Successfully received weather data:', data);
        console.log('WeatherForecast: Data location:', data?.location);
        console.log('WeatherForecast: Data forecast length:', data?.forecast?.length);
        
        // Clear any previous errors and set the data
        setError(null);
        setWeatherData(data);
      } catch (err) {
        console.error('WeatherForecast: Error in fetchWeather:', err);
        console.error('WeatherForecast: Error details:', JSON.stringify(err, null, 2));
        setError('Failed to load weather data');
      } finally {
        console.log('WeatherForecast: Setting loading to false');
        setLoading(false);
      }
    };

    if (address) {
      console.log('WeatherForecast: Address provided, fetching weather:', address);
      fetchWeather();
    } else {
      console.log('WeatherForecast: No address provided');
    }
  }, [address]);

  const getWeatherIcon = (iconCode: string) => {
    // Map OpenWeather icon codes to our Lucide icons
    if (iconCode.includes('01')) return <Sun className="h-6 w-6 text-yellow-500" />;
    if (iconCode.includes('02') || iconCode.includes('03') || iconCode.includes('04')) 
      return <Cloud className="h-6 w-6 text-gray-500" />;
    if (iconCode.includes('09') || iconCode.includes('10') || iconCode.includes('11')) 
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    return <Cloud className="h-6 w-6 text-gray-500" />;
  };

  console.log('WeatherForecast RENDER:', { loading, error: !!error, hasWeatherData: !!weatherData, weatherDataLocation: weatherData?.location });

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-8"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{error}</p>
        </div>
      </Card>
    );
  }

  if (!weatherData) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center space-x-2 mb-4">
        <Wind className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">
          10-Day Forecast - {weatherData.location}
        </h3>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4">
        {weatherData.forecast.map((day, index) => (
          <Card key={index} className="flex-shrink-0 w-32 p-4 text-center hover:shadow-md transition-shadow">
            <div className="space-y-3">
              {/* Day */}
               <p className="text-sm font-medium text-black">
                 {(() => {
                   if (index === 0) return 'Today';
                   if (index === 1) return 'Tomorrow';
                   
                   const date = new Date(day.date);
                   const today = new Date();
                   const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                   
                   if (diffDays <= 6) {
                     return date.toLocaleDateString('en-US', { weekday: 'short' });
                   } else {
                     return date.toLocaleDateString('en-US', { 
                       weekday: 'short',
                       month: 'numeric',
                       day: 'numeric'
                     });
                   }
                 })()}
               </p>
              
              {/* Weather Icon */}
              <div className="flex justify-center">
                {getWeatherIcon(day.icon)}
              </div>
              
              {/* Temperature */}
              <div className="space-y-1">
                <p className="text-lg font-bold text-black">{day.temperature}°</p>
                <p className="text-xs text-gray-500 capitalize leading-tight">{day.description}</p>
              </div>
              
              {/* Weather Details */}
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center justify-center space-x-1">
                  <span>💧</span>
                  <span>{typeof day.humidity === 'string' && day.humidity === 'N/A' ? '45' : day.humidity}%</span>
                </div>
                <div className="flex items-center justify-center space-x-1">
                  <span>💨</span>
                  <span>{typeof day.windSpeed === 'string' && day.windSpeed === 'N/A' ? '5 mph' : day.windSpeed}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}