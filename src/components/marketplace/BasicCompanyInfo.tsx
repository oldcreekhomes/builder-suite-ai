import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StructuredAddressInput } from "@/components/StructuredAddressInput";

interface BasicCompanyInfoProps {
  companyName: string;
  setCompanyName: (value: string) => void;
  companyType: string;
  setCompanyType: (value: string) => void;
  addressData: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip_code: string;
  };
  setAddressData: (value: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip_code: string;
  }) => void;
  website: string;
  setWebsite: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  companyNameRef: React.RefObject<HTMLInputElement>;
  isGoogleLoaded: boolean;
  isLoadingGoogleData: boolean;
}

const companyTypes = [
  "Subcontractor",
  "Vendor", 
  "Municipality",
  "Consultant",
  "Finance"
];

export function BasicCompanyInfo({
  companyName,
  setCompanyName,
  companyType,
  setCompanyType,
  addressData,
  setAddressData,
  website,
  setWebsite,
  phoneNumber,
  setPhoneNumber,
  description,
  setDescription,
  companyNameRef,
  isGoogleLoaded,
  isLoadingGoogleData
}: BasicCompanyInfoProps) {
  return (
    <>
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
          <Select value={companyType} onValueChange={setCompanyType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select company type..." />
            </SelectTrigger>
            <SelectContent>
              {companyTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Company Address</Label>
        <StructuredAddressInput
          value={addressData}
          onChange={setAddressData}
          disabled={isLoadingGoogleData}
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
    </>
  );
}