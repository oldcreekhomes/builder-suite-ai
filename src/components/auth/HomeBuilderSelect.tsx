
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface HomeBuilderSelectProps {
  value: string;
  onChange: (value: string) => void;
}

interface HomeBuilder {
  id: string;
  company_name: string;
}

const HomeBuilderSelect = ({ value, onChange }: HomeBuilderSelectProps) => {
  const [homeBuilders, setHomeBuilders] = useState<HomeBuilder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    fetchHomeBuilders();
  }, []);

  const fetchHomeBuilders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_home_builders');
      if (error) {
        console.error('Error fetching home builders:', error);
        return;
      }
      setHomeBuilders(data || []);
    } catch (error) {
      console.error('Error fetching home builders:', error);
    }
  };

  const filteredBuilders = homeBuilders.filter(builder =>
    builder.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (builder: HomeBuilder) => {
    setSelectedCompany(builder.company_name);
    setSearchTerm(builder.company_name);
    onChange(builder.id);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="home-builder">Select Your Home Building Company</Label>
      <div className="relative">
        <Input
          id="home-builder"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for your company..."
          required
        />
        {isOpen && filteredBuilders.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredBuilders.map((builder) => (
              <div
                key={builder.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(builder)}
              >
                {builder.company_name}
              </div>
            ))}
          </div>
        )}
        {isOpen && searchTerm && filteredBuilders.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-gray-500">
            No companies found. Please contact your home builder to ensure they are registered.
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeBuilderSelect;
