
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BasicCompanyInfoProps {
  companyName: string;
  setCompanyName: (value: string) => void;
  companyType: string;
  setCompanyType: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
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
  address,
  setAddress,
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
  const [open, setOpen] = useState(false);

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {companyType || "Select company type..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" style={{ zIndex: 999999 }}>
              <Command>
                <CommandInput placeholder="Search company type..." />
                <CommandList>
                  <CommandEmpty>No company type found.</CommandEmpty>
                  <CommandGroup>
                    {companyTypes.map((type) => (
                      <CommandItem
                        key={type}
                        value={type}
                      onSelect={(currentValue) => {
                        setCompanyType(type);
                        setOpen(false);
                      }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            companyType === type ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {type}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
    </>
  );
}
