import { useState, useCallback, useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StructuredAddressInput } from "@/components/StructuredAddressInput";
import { CostCodeSelector } from "@/components/companies/CostCodeSelector";
import { InsuranceContent } from "@/components/companies/CompanyInsuranceSection";
import { ExtractedInsuranceData } from "@/components/companies/InsuranceCertificateUpload";
import { InlineRepresentativeForm, InlineRepresentativeFormRef, InlineRepresentativeData } from "@/components/companies/InlineRepresentativeForm";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import { Search } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

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
  company_type: z.enum(["Subcontractor", "Vendor", "Consultant", "Lender", "Municipality", "Utility"]),
  address_line_1: z.string().min(1, "Street address is required"),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  phone_number: z.string().optional(),
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
  onCompanyCreated,
}: AddCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);
  const [costCodeError, setCostCodeError] = useState<string>("");
  const [extractedInsuranceData, setExtractedInsuranceData] = useState<ExtractedInsuranceData | null>(null);
  const [pendingInsuranceFilePath, setPendingInsuranceFilePath] = useState<string | null>(null);
  
  // Representative state
  const [representativeError, setRepresentativeError] = useState<string>("");
  const representativeFormRef = useRef<InlineRepresentativeFormRef>(null);

  // Get current user's home builder ID for insurance upload
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: userDetails } = await supabase
        .from('users')
        .select('home_builder_id')
        .eq('id', user.id)
        .single();
      
      return {
        id: user.id,
        homeBuilder: userDetails?.home_builder_id || user.id
      };
    },
  });
  

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
  // Handler for extracted insurance data (receives file path for new companies)
  const handleExtractedDataChange = useCallback((data: ExtractedInsuranceData | null, filePathOrId: string | null) => {
    setExtractedInsuranceData(data);
    setPendingInsuranceFilePath(filePathOrId);
  }, []);

  const createCompanyMutation = useMutation({
    mutationFn: async (payload: CompanyFormData & { 
      repData?: InlineRepresentativeData;
      homeBuilderIdToUse?: string;
    }) => {
      const { repData, homeBuilderIdToUse: passedHomeBuilderId, ...data } = payload;
      
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

      // Use passed homeBuilderIdToUse, or calculate it
      const homeBuilderIdToUse = passedHomeBuilderId || userDetails?.home_builder_id || user.id;

      // Check for duplicate company name (case-insensitive)
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('home_builder_id', homeBuilderIdToUse)
        .ilike('company_name', data.company_name.trim())
        .maybeSingle();

      if (existingCompany) {
        throw new Error(`A company named "${existingCompany.company_name}" already exists`);
      }

      const insertData = {
        company_name: data.company_name.trim(),
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

      // Save extracted insurance data if available
      if (extractedInsuranceData && extractedInsuranceData.coverages.length > 0) {
        for (const coverage of extractedInsuranceData.coverages) {
          if (!coverage.expiration_date) continue;
          
          const { error: insuranceError } = await supabase
            .from('company_insurances')
            .insert({
              company_id: company.id,
              insurance_type: coverage.type,
              expiration_date: coverage.expiration_date,
              policy_number: coverage.policy_number || null,
              carrier_name: coverage.insurer_name || null,
              home_builder_id: homeBuilderIdToUse,
            });
          
          if (insuranceError) throw insuranceError;
        }
      }

      // Insert representative (passed via mutation payload) BEFORE returning
      if (repData) {
        const { error: repError } = await supabase
          .from('company_representatives')
          .insert({
            first_name: repData.first_name,
            last_name: repData.last_name || null,
            email: repData.email,
            phone_number: repData.phone_number || null,
            title: repData.title,
            receive_bid_notifications: repData.receive_bid_notifications,
            receive_schedule_notifications: repData.receive_schedule_notifications,
            receive_po_notifications: repData.receive_po_notifications,
            company_id: company.id,
            home_builder_id: homeBuilderIdToUse,
          });

        if (repError) {
          console.error('Error creating representative:', repError);
          throw new Error('Company created but failed to add representative');
        }
      }

      // Create pending upload record with the new company_id (for audit trail)
      if (pendingInsuranceFilePath && extractedInsuranceData) {
        const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
        await supabase.from('pending_insurance_uploads').insert([{
          company_id: company.id,
          file_name: pendingInsuranceFilePath.split('/').pop() || 'certificate.pdf',
          file_path: pendingInsuranceFilePath,
          file_size: 0,
          content_type: 'application/pdf',
          status: 'completed',
          owner_id: homeBuilderIdToUse,
          uploaded_by: currentAuthUser?.id || user.id,
          extracted_data: JSON.parse(JSON.stringify(extractedInsuranceData)) as Json,
        }]);
      }

      return company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
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
      setExtractedInsuranceData(null);
      setPendingInsuranceFilePath(null);
      representativeFormRef.current?.reset();
      setRepresentativeError("");
      onOpenChange(false);
      
      // Only refresh if not in callback mode (to preserve bill data)
      if (!onCompanyCreated) {
        window.location.reload();
      }
    },
    onError: (error: Error) => {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    // Validate cost codes
    if (selectedCostCodes.length === 0) {
      setCostCodeError("Associated cost codes are required");
      toast({
        title: "Error",
        description: "Please select at least one cost code",
        variant: "destructive",
      });
      return;
    }
    
    // Validate representative form
    if (!representativeFormRef.current) {
      setRepresentativeError("Please fill in the representative information");
      toast({
        title: "Representative Required",
        description: "Please fill in the representative information.",
        variant: "destructive",
      });
      return;
    }
    
    const isValid = await representativeFormRef.current.validate();
    if (!isValid) {
      setRepresentativeError("Please fill in all required representative fields");
      toast({
        title: "Representative Required",
        description: "Please fill in First Name, Email, and Title for the representative.",
        variant: "destructive",
      });
      return;
    }
    
    // Get representative data
    const repData = representativeFormRef.current.getValues();
    
    // Get user info for determining home_builder_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    const { data: userDetails } = await supabase
      .from('users')
      .select('role, home_builder_id')
      .eq('id', user.id)
      .single();

    const homeBuilderIdToUse = userDetails?.home_builder_id || user.id;
    
    // Clear errors and submit with representative data included
    setCostCodeError("");
    setRepresentativeError("");
    
    // Pass representative data directly to the mutation
    createCompanyMutation.mutate({
      ...data,
      repData,
      homeBuilderIdToUse,
    });
  };

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form and selections when closing
      form.reset();
      setSelectedCostCodes([]);
      setCostCodeError("");
      setExtractedInsuranceData(null);
      setPendingInsuranceFilePath(null);
      representativeFormRef.current?.reset();
      setRepresentativeError("");
    }
    onOpenChange(newOpen);
  }, [onOpenChange, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive">*</span> Company Information and Representatives are required
        </p>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-1">
              <Tabs defaultValue="company-info" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="company-info">
                    Company Information <span className="text-destructive ml-1">*</span>
                  </TabsTrigger>
                  <TabsTrigger value="representatives">
                    Representatives <span className="text-destructive ml-1">*</span>
                  </TabsTrigger>
                  <TabsTrigger value="insurance">Insurance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="company-info" className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder={isGoogleLoaded ? "Search for company..." : "Enter company name"}
                                className="pl-9"
                                autoComplete="off"
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
                          <FormLabel>Company Type <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                              <SelectItem value="Vendor">Vendor</SelectItem>
                              <SelectItem value="Consultant">Consultant</SelectItem>
                              <SelectItem value="Lender">Lender</SelectItem>
                              <SelectItem value="Municipality">Municipality</SelectItem>
                              <SelectItem value="Utility">Utility</SelectItem>
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
                                const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
                                form.setValue("address_line_1", addressData.address_line_1, options);
                                form.setValue("address_line_2", addressData.address_line_2, options);
                                form.setValue("city", addressData.city, options);
                                form.setValue("state", addressData.state, options);
                                form.setValue("zip_code", addressData.zip_code, options);
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
                            <Input placeholder="(555) 123-4567" {...field} />
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
                            <Input placeholder="www.example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel className={costCodeError ? "text-destructive" : ""}>
                      Associated Cost Codes <span className="text-destructive">*</span>
                    </FormLabel>
                    <CostCodeSelector 
                      selectedCostCodes={selectedCostCodes}
                      onCostCodesChange={handleCostCodesChange}
                    />
                    {costCodeError && (
                      <p className="text-sm font-medium text-destructive">{costCodeError}</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="representatives" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Fill in the representative information below. Required fields: First Name, Email, and Title.
                    </p>

                    {representativeError && (
                      <p className="text-sm font-medium text-destructive">{representativeError}</p>
                    )}

                    <InlineRepresentativeForm ref={representativeFormRef} />
                  </div>
                </TabsContent>
                
              <TabsContent value="insurance" className="space-y-6 mt-6">
                  <InsuranceContent 
                    companyId={null}
                    homeBuilder=""
                    onExtractedDataChange={handleExtractedDataChange}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createCompanyMutation.isPending}
                >
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
