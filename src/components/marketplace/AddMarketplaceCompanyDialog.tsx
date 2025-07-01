
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface AddMarketplaceCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMarketplaceCompanyDialog({ open, onOpenChange }: AddMarketplaceCompanyDialogProps) {
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [licenseNumbers, setLicenseNumbers] = useState<string[]>([]);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [rating, setRating] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newServiceArea, setNewServiceArea] = useState("");
  const [newLicenseNumber, setNewLicenseNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGoogleData, setIsLoadingGoogleData] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const companyNameRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const queryClient = useQueryClient();

  // Load Google Maps API key
  useEffect(() => {
    const getApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) throw error;
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Failed to get Google Maps API key:', error);
        setApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null);
      }
    };

    getApiKey();
  }, []);

  // Load Google Places API
  useEffect(() => {
    if (!apiKey) return;

    const loadGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleLoaded(true);
      script.onerror = () => console.error('Failed to load Google Places API');
      document.head.appendChild(script);
    };

    loadGooglePlaces();
  }, [apiKey]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isGoogleLoaded || !companyNameRef.current || !open) return;

    // Add custom CSS for autocomplete dropdown z-index
    const addAutocompleteStyles = () => {
      if (!document.getElementById('google-autocomplete-styles')) {
        const style = document.createElement('style');
        style.id = 'google-autocomplete-styles';
        style.textContent = `
          .pac-container {
            z-index: 9999 !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          }
          .pac-item {
            padding: 8px 12px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            cursor: pointer !important;
          }
          .pac-item:hover {
            background-color: #f8fafc !important;
          }
          .pac-item-selected {
            background-color: #e2e8f0 !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    addAutocompleteStyles();

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        companyNameRef.current,
        {
          types: ['establishment'],
          fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'business_status', 'types']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('Place selected:', place);
        
        if (place && place.name) {
          setIsLoadingGoogleData(true);
          
          // Auto-populate fields
          setCompanyName(place.name);
          setAddress(place.formatted_address || "");
          setPhoneNumber(place.formatted_phone_number || "");
          setWebsite(place.website || "");
          setRating(place.rating ? place.rating.toString() : "");
          setReviewCount(place.user_ratings_total ? place.user_ratings_total.toString() : "");
          
          // Try to determine company type from Google place types
          if (place.types) {
            const placeTypes = place.types;
            if (placeTypes.includes('general_contractor') || placeTypes.includes('contractor')) {
              setCompanyType('Subcontractor');
            } else if (placeTypes.includes('store') || placeTypes.includes('hardware_store')) {
              setCompanyType('Vendor');
            } else if (placeTypes.includes('local_government_office')) {
              setCompanyType('Municipality');
            }
          }

          setIsLoadingGoogleData(false);
          
          toast({
            title: "Success",
            description: "Company information loaded from Google Places",
          });
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleLoaded, open]);

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleAddServiceArea = () => {
    if (newServiceArea.trim() && !serviceAreas.includes(newServiceArea.trim())) {
      setServiceAreas([...serviceAreas, newServiceArea.trim()]);
      setNewServiceArea("");
    }
  };

  const handleRemoveServiceArea = (area: string) => {
    setServiceAreas(serviceAreas.filter(a => a !== area));
  };

  const handleAddLicenseNumber = () => {
    if (newLicenseNumber.trim() && !licenseNumbers.includes(newLicenseNumber.trim())) {
      setLicenseNumbers([...licenseNumbers, newLicenseNumber.trim()]);
      setNewLicenseNumber("");
    }
  };

  const handleRemoveLicenseNumber = (license: string) => {
    setLicenseNumbers(licenseNumbers.filter(l => l !== license));
  };

  const resetForm = () => {
    setCompanyName("");
    setCompanyType("");
    setAddress("");
    setWebsite("");
    setPhoneNumber("");
    setDescription("");
    setSpecialties([]);
    setServiceAreas([]);
    setLicenseNumbers([]);
    setInsuranceVerified(false);
    setRating("");
    setReviewCount("");
    setNewSpecialty("");
    setNewServiceArea("");
    setNewLicenseNumber("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !companyType) {
      toast({
        title: "Error",
        description: "Company name and type are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('marketplace_companies')
        .insert({
          company_name: companyName.trim(),
          company_type: companyType,
          address: address.trim() || null,
          website: website.trim() || null,
          phone_number: phoneNumber.trim() || null,
          description: description.trim() || null,
          specialties: specialties.length > 0 ? specialties : null,
          service_areas: serviceAreas.length > 0 ? serviceAreas : null,
          license_numbers: licenseNumbers.length > 0 ? licenseNumbers : null,
          insurance_verified: insuranceVerified,
          rating: rating ? parseFloat(rating) : null,
          review_count: reviewCount ? parseInt(reviewCount) : 0,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Marketplace company added successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['marketplace-companies'] });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding marketplace company:', error);
      toast({
        title: "Error",
        description: "Failed to add marketplace company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" style={{ zIndex: 50 }}>
        <DialogHeader className="pr-8">
          <DialogTitle>Add Marketplace Company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <div className="relative">
                <Input
                  ref={companyNameRef}
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={isGoogleLoaded ? "Start typing company name..." : "Enter company name"}
                  required
                  disabled={isLoadingGoogleData}
                  autoComplete="off"
                />
                {isGoogleLoaded && (
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                )}
                {isLoadingGoogleData && (
                  <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                )}
              </div>
              {isGoogleLoaded && (
                <p className="text-xs text-gray-500 mt-1">
                  Search powered by Google Places - start typing to see suggestions
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="companyType">Company Type *</Label>
              <Select value={companyType} onValueChange={setCompanyType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Municipality">Municipality</SelectItem>
                  <SelectItem value="Consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter company address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.company.com"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter company description"
              rows={3}
            />
          </div>

          <div>
            <Label>Specialties</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add specialty"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialty())}
              />
              <Button type="button" onClick={handleAddSpecialty} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveSpecialty(specialty)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Service Areas</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newServiceArea}
                onChange={(e) => setNewServiceArea(e.target.value)}
                placeholder="Add service area"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddServiceArea())}
              />
              <Button type="button" onClick={handleAddServiceArea} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveServiceArea(area)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>License Numbers</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newLicenseNumber}
                onChange={(e) => setNewLicenseNumber(e.target.value)}
                placeholder="Add license number"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLicenseNumber())}
              />
              <Button type="button" onClick={handleAddLicenseNumber} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {licenseNumbers.map((license) => (
                <Badge key={license} variant="outline" className="text-xs font-mono">
                  {license}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveLicenseNumber(license)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rating">Rating (0-5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="4.5"
              />
            </div>

            <div>
              <Label htmlFor="reviewCount">Review Count</Label>
              <Input
                id="reviewCount"
                type="number"
                min="0"
                value={reviewCount}
                onChange={(e) => setReviewCount(e.target.value)}
                placeholder="25"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="insuranceVerified"
              checked={insuranceVerified}
              onCheckedChange={(checked) => setInsuranceVerified(checked === true)}
            />
            <Label htmlFor="insuranceVerified">Insurance Verified</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Company"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
