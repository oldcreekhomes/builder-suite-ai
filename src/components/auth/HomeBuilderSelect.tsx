
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HomeBuilder {
  id: string;
  company_name: string;
}

interface HomeBuilderSelectProps {
  onSelect: (id: string, name: string) => void;
}

const HomeBuilderSelect = ({ onSelect }: HomeBuilderSelectProps) => {
  const [homeBuilders, setHomeBuilders] = useState<HomeBuilder[]>([]);
  const [filteredBuilders, setFilteredBuilders] = useState<HomeBuilder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuilder, setSelectedBuilder] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHomeBuilders();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = homeBuilders.filter(builder =>
        builder.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBuilders(filtered);
    } else {
      setFilteredBuilders(homeBuilders);
    }
  }, [searchTerm, homeBuilders]);

  const fetchHomeBuilders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_home_builders');
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load home builders",
          variant: "destructive",
        });
      } else {
        setHomeBuilders(data || []);
        setFilteredBuilders(data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBuilder = (builderId: string) => {
    const builder = homeBuilders.find(b => b.id === builderId);
    if (builder) {
      setSelectedBuilder(builderId);
      onSelect(builderId, builder.company_name);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="home-builder-search">Select Home Builder</Label>
      <Input
        id="home-builder-search"
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for home builders..."
        className="mb-2"
      />
      
      <Select value={selectedBuilder} onValueChange={handleSelectBuilder}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading..." : "Select a home builder"} />
        </SelectTrigger>
        <SelectContent>
          {filteredBuilders.map((builder) => (
            <SelectItem key={builder.id} value={builder.id}>
              {builder.company_name}
            </SelectItem>
          ))}
          {filteredBuilders.length === 0 && !isLoading && (
            <SelectItem value="no-results" disabled>
              No home builders found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default HomeBuilderSelect;
