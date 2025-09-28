import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { BasicCompanyInfo } from "./BasicCompanyInfo";
import { ArrayFieldManager } from "./ArrayFieldManager";
import { RatingAndVerification } from "./RatingAndVerification";
import { createFormDataFromPlace, addToArray, removeFromArray } from "@/utils/marketplaceCompanyUtils";

interface AddMarketplaceCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMarketplaceCompanyDialog({ open, onOpenChange }: AddMarketplaceCompanyDialogProps) {
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [addressData, setAddressData] = useState({
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip_code: ""
  });
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

  const queryClient = useQueryClient();

  const handlePlaceSelected = (place: any) => {
    console.log('handlePlaceSelected called with:', place);
    const formData = createFormDataFromPlace(place);
    setCompanyName(formData.companyName);
    
    // Parse the address into structured format if available
    if (place.address_components) {
      const newAddressData = {
        address_line_1: "",
        address_line_2: addressData.address_line_2, // Keep existing suite
        city: "",
        state: "",
        zip_code: ""
      };

      place.address_components.forEach((component: any) => {
        const types = component.types;
        if (types.includes('street_number')) {
          newAddressData.address_line_1 = component.long_name + ' ';
        } else if (types.includes('route')) {
          newAddressData.address_line_1 += component.long_name;
        } else if (types.includes('locality')) {
          newAddressData.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          newAddressData.state = component.short_name;
        } else if (types.includes('postal_code')) {
          newAddressData.zip_code = component.long_name;
        }
      });
      
      setAddressData(newAddressData);
    } else {
      // Fallback: put full address in address_line_1
      setAddressData({
        ...addressData,
        address_line_1: formData.address
      });
    }
    
    setPhoneNumber(formData.phoneNumber);
    setWebsite(formData.website);
    setRating(formData.rating);
    setReviewCount(formData.reviewCount);
    if (formData.companyType) {
      setCompanyType(formData.companyType);
    }
  };

  const { companyNameRef, isGoogleLoaded, isLoadingGoogleData } = useGooglePlaces(open, handlePlaceSelected);

  const handleAddSpecialty = () => {
    const updatedSpecialties = addToArray(specialties, newSpecialty);
    if (updatedSpecialties !== specialties) {
      setSpecialties(updatedSpecialties);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(removeFromArray(specialties, specialty));
  };

  const handleAddServiceArea = () => {
    const updatedServiceAreas = addToArray(serviceAreas, newServiceArea);
    if (updatedServiceAreas !== serviceAreas) {
      setServiceAreas(updatedServiceAreas);
      setNewServiceArea("");
    }
  };

  const handleRemoveServiceArea = (area: string) => {
    setServiceAreas(removeFromArray(serviceAreas, area));
  };

  const handleAddLicenseNumber = () => {
    const updatedLicenseNumbers = addToArray(licenseNumbers, newLicenseNumber);
    if (updatedLicenseNumbers !== licenseNumbers) {
      setLicenseNumbers(updatedLicenseNumbers);
      setNewLicenseNumber("");
    }
  };

  const handleRemoveLicenseNumber = (license: string) => {
    setLicenseNumbers(removeFromArray(licenseNumbers, license));
  };

  const resetForm = () => {
    setCompanyName("");
    setCompanyType("");
    setAddressData({
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip_code: ""
    });
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
      // Build full address for legacy compatibility
      const fullAddress = [
        addressData.address_line_1,
        addressData.address_line_2,
        addressData.city,
        addressData.state,
        addressData.zip_code
      ].filter(Boolean).join(', ');

      const { error } = await supabase
        .from('marketplace_companies')
        .insert({
          company_name: companyName.trim(),
          company_type: companyType,
          address: fullAddress || null,
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader className="pr-8">
          <DialogTitle>Add Marketplace Company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <BasicCompanyInfo
            companyName={companyName}
            setCompanyName={setCompanyName}
            companyType={companyType}
            setCompanyType={setCompanyType}
            addressData={addressData}
            setAddressData={setAddressData}
            website={website}
            setWebsite={setWebsite}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            description={description}
            setDescription={setDescription}
            companyNameRef={companyNameRef}
            isGoogleLoaded={isGoogleLoaded}
            isLoadingGoogleData={isLoadingGoogleData}
          />

          <ArrayFieldManager
            label="Specialties"
            items={specialties}
            newItem={newSpecialty}
            setNewItem={setNewSpecialty}
            onAddItem={handleAddSpecialty}
            onRemoveItem={handleRemoveSpecialty}
            placeholder="Add specialty"
            badgeVariant="secondary"
          />

          <ArrayFieldManager
            label="Service Areas"
            items={serviceAreas}
            newItem={newServiceArea}
            setNewItem={setNewServiceArea}
            onAddItem={handleAddServiceArea}
            onRemoveItem={handleRemoveServiceArea}
            placeholder="Add service area"
            badgeVariant="outline"
          />

          <ArrayFieldManager
            label="License Numbers"
            items={licenseNumbers}
            newItem={newLicenseNumber}
            setNewItem={setNewLicenseNumber}
            onAddItem={handleAddLicenseNumber}
            onRemoveItem={handleRemoveLicenseNumber}
            placeholder="Add license number"
            badgeVariant="outline"
            badgeClassName="text-xs font-mono"
          />

          <RatingAndVerification
            rating={rating}
            setRating={setRating}
            reviewCount={reviewCount}
            setReviewCount={setReviewCount}
            insuranceVerified={insuranceVerified}
            setInsuranceVerified={setInsuranceVerified}
          />

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
