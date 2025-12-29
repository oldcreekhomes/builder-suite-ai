
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StructuredAddressInput } from "@/components/StructuredAddressInput";
import { CostCodeSelector } from "./CostCodeSelector";
import { RepresentativeContent } from "./RepresentativeSelector";
import { InsuranceContent } from "./CompanyInsuranceSection";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { Search, ShieldOff, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const companySchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_type: z.enum(["Consultant", "Lender", "Municipality", "Subcontractor", "Vendor"]),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  website?: string;
  home_builder_id: string;
  insurance_required?: boolean;
}

interface EditCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to parse legacy address string (e.g., "10212 Richmond Hwy, Lorton, VA 22079, USA")
function parseLegacyAddress(address: string): {
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
} {
  if (!address) {
    return { address_line_1: '', city: '', state: '', zip_code: '' };
  }

  // Remove country suffix (USA, United States, etc.)
  const cleanedAddress = address
    .replace(/,?\s*(USA|United States|US)$/i, '')
    .trim();

  const parts = cleanedAddress.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    // Format: "Street Address, City, State ZIP"
    const address_line_1 = parts[0];
    const city = parts[1];
    // Last part contains "State ZIP" like "VA 22079"
    const stateZipPart = parts[parts.length - 1];
    const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
    
    if (stateZipMatch) {
      return {
        address_line_1,
        city,
        state: stateZipMatch[1].toUpperCase(),
        zip_code: stateZipMatch[2],
      };
    }
    
    // Fallback: try to parse state and zip separately
    return {
      address_line_1,
      city,
      state: stateZipPart.replace(/\d+/g, '').trim(),
      zip_code: stateZipPart.replace(/[^\d-]/g, '').trim(),
    };
  } else if (parts.length === 2) {
    // Format: "Street Address, City State ZIP"
    const address_line_1 = parts[0];
    const cityStateZip = parts[1];
    const match = cityStateZip.match(/^(.+?)\s+([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/i);
    
    if (match) {
      return {
        address_line_1,
        city: match[1].trim(),
        state: match[2].toUpperCase(),
        zip_code: match[3],
      };
    }
    
    return { address_line_1, city: cityStateZip, state: '', zip_code: '' };
  }

  // Single part - just use as address line 1
  return { address_line_1: cleanedAddress, city: '', state: '', zip_code: '' };
}

// Helper to parse address components from Google Places
function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]) {
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zipCode = '';

  for (const component of components) {
    const types = component.types;
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.short_name;
    } else if (types.includes('postal_code')) {
      zipCode = component.long_name;
    }
  }

  return {
    address_line_1: [streetNumber, route].filter(Boolean).join(' '),
    city,
    state,
    zip_code: zipCode,
  };
}

export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);
  const initializationDone = useRef(false);

  // Stable company ID for preventing unnecessary re-renders
  const stableCompanyId = useMemo(() => company?.id, [company?.id]);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_type: "Subcontractor",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip_code: "",
      phone_number: "",
      website: "",
    },
  });

  // Handle Google Places selection
  const handlePlaceSelected = useCallback((place: google.maps.places.PlaceResult) => {
    console.log('Place selected:', place);
    
    // Set company name
    if (place.name) {
      form.setValue('company_name', place.name);
    }

    // Parse and set address components
    if (place.address_components) {
      const parsed = parseAddressComponents(place.address_components);
      form.setValue('address_line_1', parsed.address_line_1);
      form.setValue('city', parsed.city);
      form.setValue('state', parsed.state);
      form.setValue('zip_code', parsed.zip_code);
    }

    // Set phone number
    if (place.formatted_phone_number) {
      form.setValue('phone_number', place.formatted_phone_number);
    }

    // Set website
    if (place.website) {
      form.setValue('website', place.website);
    }
  }, [form]);

  // Use Google Places hook for company name autocomplete
  const { companyNameRef, isGoogleLoaded, isLoadingGoogleData } = useGooglePlaces(open, handlePlaceSelected);

  // Fetch company's current cost codes
  const { data: companyCostCodes = [] } = useQuery({
    queryKey: ['company-cost-codes', stableCompanyId],
    queryFn: async () => {
      if (!stableCompanyId) return [];
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select('cost_code_id')
        .eq('company_id', stableCompanyId);
      
      if (error) throw error;
      return data.map(item => item.cost_code_id);
    },
    enabled: !!stableCompanyId && open,
  });

  // Initialize form data when dialog opens with a company
  useEffect(() => {
    if (company && open && !initializationDone.current) {
      console.log('Initializing form for company:', company.id);
      
      // Check if structured address fields are empty but legacy address exists
      const hasStructuredAddress = company.address_line_1 || company.city || company.state || company.zip_code;
      let addressFields = {
        address_line_1: company.address_line_1 || "",
        address_line_2: company.address_line_2 || "",
        city: company.city || "",
        state: company.state || "",
        zip_code: company.zip_code || "",
      };

      // Parse legacy address as fallback
      if (!hasStructuredAddress && company.address) {
        console.log('Parsing legacy address:', company.address);
        const parsed = parseLegacyAddress(company.address);
        addressFields = {
          ...addressFields,
          ...parsed,
        };
      }
      
      form.reset({
        company_name: company.company_name,
        company_type: company.company_type as any,
        ...addressFields,
        phone_number: company.phone_number || "",
        website: company.website || "",
      });

      initializationDone.current = true;
    }
  }, [company, open, form]);

  // Initialize cost codes when dialog opens and data is available
  useEffect(() => {
    if (open && companyCostCodes.length > 0 && selectedCostCodes.length === 0) {
      console.log('Setting cost codes:', companyCostCodes);
      setSelectedCostCodes([...companyCostCodes]);
    }
  }, [open, companyCostCodes]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCostCodes([]);
      initializationDone.current = false;
      form.reset();
    }
  }, [open, form]);

  // Save cost code associations mutation
  const saveCostCodesMutation = useMutation({
    mutationFn: async (costCodeIds: string[]) => {
      if (!company?.id) return;
      
      console.log('Saving cost codes for company:', company.id, costCodeIds);
      
      // First, remove all existing associations
      const { error: deleteError } = await supabase
        .from('company_cost_codes')
        .delete()
        .eq('company_id', company.id);

      if (deleteError) throw deleteError;

      // Then add the new associations
      if (costCodeIds.length > 0) {
        const costCodeAssociations = costCodeIds.map(costCodeId => ({
          company_id: company.id,
          cost_code_id: costCodeId,
        }));

        const { error: insertError } = await supabase
          .from('company_cost_codes')
          .insert(costCodeAssociations);

        if (insertError) throw insertError;
      }

      return costCodeIds;
    },
    onSuccess: () => {
      // Invalidate and refetch the company cost codes
      queryClient.invalidateQueries({ queryKey: ['company-cost-codes', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      toast({
        title: "Success",
        description: "Cost code associations updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating cost codes:', error);
      toast({
        title: "Error",
        description: "Failed to update cost code associations",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!company) return;

      const updateData = {
        ...data,
        // Build legacy address field for compatibility
        address: [
          data.address_line_1,
          data.address_line_2,
          data.city,
          data.state,
          data.zip_code
        ].filter(Boolean).join(', ') || null,
      };

      const { error: companyError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id);
      
      if (companyError) throw companyError;

      // Also save cost codes
      await saveCostCodesMutation.mutateAsync(selectedCostCodes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    },
  });

  const handleCostCodesChange = (costCodes: string[]) => {
    setSelectedCostCodes(costCodes);
  };

  const onSubmit = (data: CompanyFormData) => {
    updateCompanyMutation.mutate(data);
  };

  // Don't render dialog if no company is selected
  if (!company) {
    return null;
  }

  return (
    <Dialog key={stableCompanyId} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-1">
            <Tabs defaultValue="company-info" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="company-info">Company Information</TabsTrigger>
                <TabsTrigger value="representatives">Representatives</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="company-info" className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder={isGoogleLoaded ? "Search company name..." : "Enter company name"}
                              className="pl-9"
                              {...field}
                              ref={(e) => {
                                field.ref(e);
                                (companyNameRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                              }}
                              disabled={isLoadingGoogleData}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Consultant">Consultant</SelectItem>
                            <SelectItem value="Lender">Lender</SelectItem>
                            <SelectItem value="Municipality">Municipality</SelectItem>
                            <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                            <SelectItem value="Vendor">Vendor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address_line_1"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <StructuredAddressInput
                            value={{
                              address_line_1: field.value || "",
                              address_line_2: form.watch("address_line_2") || "",
                              city: form.watch("city") || "",
                              state: form.watch("state") || "",
                              zip_code: form.watch("zip_code") || "",
                            }}
                            onChange={(addressData) => {
                              form.setValue("address_line_1", addressData.address_line_1);
                              form.setValue("address_line_2", addressData.address_line_2);
                              form.setValue("city", addressData.city);
                              form.setValue("state", addressData.state);
                              form.setValue("zip_code", addressData.zip_code);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter website URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <CostCodeSelector
                  companyId={stableCompanyId || null}
                  selectedCostCodes={selectedCostCodes}
                  onCostCodesChange={handleCostCodesChange}
                />
              </TabsContent>
              
              <TabsContent value="representatives" className="mt-6">
                <RepresentativeContent companyId={stableCompanyId || null} />
              </TabsContent>
              
              <TabsContent value="insurance" className="mt-6">
                {company?.insurance_required === false ? (
                  <Alert className="border-muted">
                    <ShieldOff className="h-4 w-4" />
                    <AlertTitle>Insurance Not Required</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      Insurance tracking is disabled for this company. To enable insurance requirements, 
                      toggle the "Insurance" switch in the Companies table.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <InsuranceContent
                    companyId={stableCompanyId || null}
                    homeBuilder={company?.home_builder_id || ""}
                  />
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCompanyMutation.isPending}>
                {updateCompanyMutation.isPending ? "Updating..." : "Update Company"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
