import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StructuredAddressInput } from "@/components/StructuredAddressInput";
import { CostCodeSelector } from "@/components/companies/CostCodeSelector";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { Search, Users, Shield } from "lucide-react";

// Helper function to parse address components from Google Places
const parseAddressComponents = (addressComponents: google.maps.GeocoderAddressComponent[] | undefined) => {
  const result = {
    address_line_1: '',
    city: '',
    state: '',
    zip_code: '',
  };

  if (!addressComponents) return result;

  let streetNumber = '';
  let route = '';

  addressComponents.forEach((component) => {
    const types = component.types;
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name;
    } else if (types.includes('postal_code')) {
      result.zip_code = component.long_name;
    }
  });

  result.address_line_1 = [streetNumber, route].filter(Boolean).join(' ');
  return result;
};

const companySchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_type: z.enum(["Consultant", "Lender", "Municipality", "Subcontractor", "Vendor"]),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  phone_number: z.string().min(1, "Phone number is required"),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCompanyName?: string;
  initialData?: {
    phone_number?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    website?: string;
  };
  onCompanyCreated?: (companyId: string, companyName: string) => void;
}

export function AddCompanyDialog({ 
  open, 
  onOpenChange, 
  initialCompanyName,
  initialData,
  onCompanyCreated 
}: AddCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);
  const [costCodeError, setCostCodeError] = useState<string>("");
  

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: initialCompanyName || "",
      company_type: "Subcontractor",
      address_line_1: initialData?.address_line_1 || "",
      address_line_2: initialData?.address_line_2 || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zip_code: initialData?.zip_code || "",
      phone_number: initialData?.phone_number || "",
      website: initialData?.website || "",
    },
  });

  // Handle place selection from Google Places
  const handlePlaceSelected = useCallback((place: google.maps.places.PlaceResult) => {
    if (place.name) {
      form.setValue("company_name", place.name);
    }
    
    // Parse address components
    const addressData = parseAddressComponents(place.address_components);
    if (addressData.address_line_1) {
      form.setValue("address_line_1", addressData.address_line_1);
    }
    if (addressData.city) {
      form.setValue("city", addressData.city);
    }
    if (addressData.state) {
      form.setValue("state", addressData.state);
    }
    if (addressData.zip_code) {
      form.setValue("zip_code", addressData.zip_code);
    }
    
    // Set phone number
    if (place.formatted_phone_number) {
      form.setValue("phone_number", place.formatted_phone_number);
    }
    
    // Set website
    if (place.website) {
      form.setValue("website", place.website);
    }
  }, [form]);

  // Initialize Google Places autocomplete on the company name field
  const { companyNameRef, isGoogleLoaded } = useGooglePlaces(open, handlePlaceSelected);


  // Update form values when initialCompanyName or initialData changes
  useEffect(() => {
    if (initialCompanyName) {
      form.setValue("company_name", initialCompanyName);
    }
    if (initialData) {
      if (initialData.phone_number) form.setValue("phone_number", initialData.phone_number);
      if (initialData.address_line_1) form.setValue("address_line_1", initialData.address_line_1);
      if (initialData.address_line_2) form.setValue("address_line_2", initialData.address_line_2);
      if (initialData.city) form.setValue("city", initialData.city);
      if (initialData.state) form.setValue("state", initialData.state);
      if (initialData.zip_code) form.setValue("zip_code", initialData.zip_code);
      if (initialData.website) form.setValue("website", initialData.website);
    }
  }, [initialCompanyName, initialData, form]);

  // Memoize the cost codes change handler to prevent infinite re-renders
  const handleCostCodesChange = useCallback((costCodes: string[]) => {
    setSelectedCostCodes(costCodes);
    // Clear error when cost codes are selected
    if (costCodes.length > 0) {
      setCostCodeError("");
    }
  }, []);

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      console.log('Creating company with data:', data);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (!user) throw new Error('User not authenticated');

      // Get user details to determine home_builder_id
      const { data: userDetails } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      // Use home_builder_id if user is internal (has home_builder_id), otherwise use user.id (for owner)
      const homeBuilderIdToUse = userDetails?.home_builder_id || user.id;

      const insertData = {
        company_name: data.company_name,
        company_type: data.company_type,
        address_line_1: data.address_line_1 || null,
        address_line_2: data.address_line_2 || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        // Build legacy address field for compatibility
        address: [
          data.address_line_1,
          data.address_line_2,
          data.city,
          data.state,
          data.zip_code
        ].filter(Boolean).join(', ') || null,
        phone_number: data.phone_number || null,
        website: data.website || null,
        home_builder_id: homeBuilderIdToUse,
      };
      console.log('Inserting company data:', insertData);

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert(insertData)
        .select()
        .single();
      
      console.log('Insert result:', { company, error: companyError });
      
      if (companyError) throw companyError;

      // Associate selected cost codes
      if (selectedCostCodes.length > 0) {
        const costCodeAssociations = selectedCostCodes.map(costCodeId => ({
          company_id: company.id,
          cost_code_id: costCodeId,
        }));

        const { error: costCodeError } = await supabase
          .from('company_cost_codes')
          .insert(costCodeAssociations);

        if (costCodeError) throw costCodeError;
      }

      return company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Success",
        description: "Company created successfully",
      });
      
      // Call the callback if provided (for bill linking)
      if (onCompanyCreated) {
        onCompanyCreated(company.id, company.company_name);
      }
      
      // Reset form and state
      form.reset();
      setSelectedCostCodes([]);
      onOpenChange(false);
      
      // Only refresh if not in callback mode (to preserve bill data)
      if (!onCompanyCreated) {
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    if (selectedCostCodes.length === 0) {
      setCostCodeError("Associated cost codes are required");
      toast({
        title: "Error",
        description: "Please select at least one cost code",
        variant: "destructive",
      });
      return;
    }
    setCostCodeError("");
    createCompanyMutation.mutate(data);
  };

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form and selections when closing
      form.reset();
      setSelectedCostCodes([]);
      setCostCodeError("");
    }
    onOpenChange(newOpen);
  }, [onOpenChange, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-1">
              <Tabs defaultValue="company-info" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="company-info">Company Information</TabsTrigger>
                  <TabsTrigger value="representatives">Company Representatives</TabsTrigger>
                  <TabsTrigger value="insurance">Insurance & Compliance</TabsTrigger>
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
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Search for company..." 
                                className="pl-9"
                                {...field}
                                ref={(e) => {
                                  field.ref(e);
                                  (companyNameRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                                }}
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    companyId={null}
                    selectedCostCodes={selectedCostCodes}
                    onCostCodesChange={handleCostCodesChange}
                    error={costCodeError}
                  />
                </TabsContent>
                
                <TabsContent value="representatives" className="mt-6">
                  <div className="border rounded-lg p-6 bg-muted/30">
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <Users className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium text-foreground">Company Representatives</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Representatives can be added after the company is created.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="insurance" className="mt-6">
                  <div className="border rounded-lg p-6 bg-muted/30">
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <Shield className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium text-foreground">Insurance & Compliance</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Insurance information can be configured after the company is created.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCompanyMutation.isPending}>
                  {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
