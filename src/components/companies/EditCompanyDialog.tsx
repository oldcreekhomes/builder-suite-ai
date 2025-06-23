
import { useState, useEffect } from "react";
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
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { CostCodeSelector } from "./CostCodeSelector";
import { RepresentativeSelector } from "./RepresentativeSelector";

const companySchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_type: z.enum(["Subcontractor", "Vendor", "Municipality", "Consultant"]),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
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
  const [selectedRepresentatives, setSelectedRepresentatives] = useState<string[]>([]);
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);

  // Fetch company's current cost codes
  const { data: companyCostCodes = [] } = useQuery({
    queryKey: ['company-cost-codes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('company_cost_codes')
        .select('cost_code_id')
        .eq('company_id', company.id);
      
      if (error) throw error;
      return data.map(item => item.cost_code_id);
    },
    enabled: !!company?.id && open,
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_type: "Subcontractor",
      address: "",
      phone_number: "",
      website: "",
    },
  });

  // Initialize form and reset states when company or dialog state changes
  useEffect(() => {
    if (company && open) {
      console.log('Initializing form for company:', company.id);
      
      form.reset({
        company_name: company.company_name,
        company_type: company.company_type as any,
        address: company.address || "",
        phone_number: company.phone_number || "",
        website: company.website || "",
      });

      setSelectedRepresentatives([]);
      // Initialize cost codes from fetched data
      setSelectedCostCodes(companyCostCodes);
    }
  }, [company?.id, open, form]);

  // Update cost codes when they're loaded (only if different)
  useEffect(() => {
    if (companyCostCodes && JSON.stringify(companyCostCodes) !== JSON.stringify(selectedCostCodes)) {
      setSelectedCostCodes(companyCostCodes);
    }
  }, [companyCostCodes]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRepresentatives([]);
      setSelectedCostCodes([]);
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

      const { error: companyError } = await supabase
        .from('companies')
        .update(data)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Municipality">Municipality</SelectItem>
                        <SelectItem value="Consultant">Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Enter company address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Cost Code Selector - Using the working component */}
            <CostCodeSelector
              companyId={company?.id || null}
              selectedCostCodes={selectedCostCodes}
              onCostCodesChange={handleCostCodesChange}
            />

            <RepresentativeSelector
              companyId={company?.id || null}
              selectedRepresentatives={selectedRepresentatives}
              onRepresentativesChange={setSelectedRepresentatives}
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
