
import { useState, useEffect, useMemo, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StructuredAddressInput } from "@/components/StructuredAddressInput";
import { CostCodeSelector } from "./CostCodeSelector";
import { RepresentativeSelector } from "./RepresentativeSelector";

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
}

interface EditCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);
  const initializationDone = useRef(false);
  

  // Stable company ID for preventing unnecessary re-renders
  const stableCompanyId = useMemo(() => company?.id, [company?.id]);

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

  // Initialize form data when dialog opens with a company
  useEffect(() => {
    if (company && open && !initializationDone.current) {
      console.log('Initializing form for company:', company.id);
      
      form.reset({
        company_name: company.company_name,
        company_type: company.company_type as any,
        address_line_1: company.address_line_1 || "",
        address_line_2: company.address_line_2 || "",
        city: company.city || "",
        state: company.state || "",
        zip_code: company.zip_code || "",
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
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

            <RepresentativeSelector
              companyId={stableCompanyId || null}
            />

            <div className="flex justify-end space-x-4">
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
