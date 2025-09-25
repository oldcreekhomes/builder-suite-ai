
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface HomeBuilder {
  id: string;
  company_name: string;
  email: string;
}

interface HomeBuilderSelectProps {
  value: string;
  onChange: (value: string, homeBuilderData: HomeBuilder | null) => void;
}

const HomeBuilderSelect = ({ value, onChange }: HomeBuilderSelectProps) => {
  const [homeBuilders, setHomeBuilders] = useState<HomeBuilder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHomeBuilders = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_home_builders');
        
        if (error) {
          console.error('Error fetching home builders:', error);
        } else {
          setHomeBuilders(data || []);
        }
      } catch (error) {
        console.error('Error calling get_home_builders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeBuilders();
  }, []);

  const handleValueChange = (selectedValue: string) => {
    const selectedBuilder = homeBuilders.find(builder => builder.id === selectedValue);
    onChange(selectedValue, selectedBuilder || null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="home-builder-select">Select Company</Label>
      <Select value={value} onValueChange={handleValueChange} required>
        <SelectTrigger id="home-builder-select">
          <SelectValue placeholder={isLoading ? "Loading companies..." : "Select a company"} />
        </SelectTrigger>
        <SelectContent>
          {homeBuilders.map((builder) => (
            <SelectItem key={builder.id} value={builder.id}>
              {builder.company_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default HomeBuilderSelect;
