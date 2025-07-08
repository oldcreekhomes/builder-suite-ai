import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherDay {
  date: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
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
        setLoading(true);
        setError(null);

        const { data, error: functionError } = await supabase.functions.invoke(
          'get-weather-forecast',
          {
            body: JSON.stringify({ address })
          }
        );

        if (functionError) {
          throw functionError;
        }

        setWeatherData(data);
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError('Failed to load weather data');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchWeather();
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
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Wind className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">
          7-Day Forecast - {weatherData.location}
        </h3>
      </div>
      
      <div className="space-y-3">
        {weatherData.forecast.map((day, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getWeatherIcon(day.icon)}
              <div>
                <p className="text-sm font-medium text-black">
                  {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-xs text-gray-500 capitalize">{day.description}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-lg font-semibold text-black">{day.temperature}°F</p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{day.humidity}% humidity</span>
                <span>•</span>
                <span>{day.windSpeed} mph</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}