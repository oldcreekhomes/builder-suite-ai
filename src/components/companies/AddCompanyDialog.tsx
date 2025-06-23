
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const companySchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_type: z.enum(["Subcontractor", "Vendor", "Municipality", "Consultant"]),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCompanyDialog({ open, onOpenChange }: AddCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCostCodes, setSelectedCostCodes] = useState<string[]>([]);
  const [costCodeSearch, setCostCodeSearch] = useState("");
  const [selectedRepresentatives, setSelectedRepresentatives] = useState<string[]>([]);
  const [representativeSearch, setRepresentativeSearch] = useState("");

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

  // Fetch cost codes for selection
  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name')
        .order('code');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch representatives for selection
  const { data: representatives = [] } = useQuery({
    queryKey: ['company-representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, company_id')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Filter cost codes based on search
  const filteredCostCodes = costCodes.filter(costCode => 
    costCode.code.toLowerCase().includes(costCodeSearch.toLowerCase()) ||
    costCode.name.toLowerCase().includes(costCodeSearch.toLowerCase())
  );

  // Filter representatives based on search
  const filteredRepresentatives = representatives.filter(rep => 
    rep.first_name.toLowerCase().includes(representativeSearch.toLowerCase()) ||
    rep.last_name.toLowerCase().includes(representativeSearch.toLowerCase())
  );

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          company_name: data.company_name,
          company_type: data.company_type,
          address: data.address || null,
          phone_number: data.phone_number || null,
          website: data.website || null,
          owner_id: user.id,
        })
        .select()
        .single();
      
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Success",
        description: "Company created successfully",
      });
      // Reset form and state
      form.reset();
      setSelectedCostCodes([]);
      setCostCodeSearch("");
      setSelectedRepresentatives([]);
      setRepresentativeSearch("");
      onOpenChange(false);
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

  const handleCostCodeToggle = (costCodeId: string) => {
    setSelectedCostCodes(prev => 
      prev.includes(costCodeId)
        ? prev.filter(id => id !== costCodeId)
        : [...prev, costCodeId]
    );
  };

  const removeCostCode = (costCodeId: string) => {
    setSelectedCostCodes(prev => prev.filter(id => id !== costCodeId));
  };

  const handleRepresentativeToggle = (representativeId: string) => {
    setSelectedRepresentatives(prev => 
      prev.includes(representativeId)
        ? prev.filter(id => id !== representativeId)
        : [...prev, representativeId]
    );
  };

  const removeRepresentative = (representativeId: string) => {
    setSelectedRepresentatives(prev => prev.filter(id => id !== representativeId));
  };

  const onSubmit = (data: CompanyFormData) => {
    createCompanyMutation.mutate(data);
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form and selections when closing
      form.reset();
      setSelectedCostCodes([]);
      setCostCodeSearch("");
      setSelectedRepresentatives([]);
      setRepresentativeSearch("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="space-y-4">
              <FormLabel>Associated Cost Codes</FormLabel>
              
              {/* Selected cost codes */}
              {selectedCostCodes.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                  {selectedCostCodes.map(costCodeId => {
                    const costCode = costCodes.find(cc => cc.id === costCodeId);
                    return costCode ? (
                      <Badge key={costCodeId} variant="secondary" className="flex items-center gap-1 text-xs">
                        {costCode.code} - {costCode.name}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeCostCode(costCodeId)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search cost codes by number or name..."
                  value={costCodeSearch}
                  onChange={(e) => setCostCodeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Cost code selection */}
              <div className="max-h-24 overflow-y-auto border rounded-md">
                {filteredCostCodes.length === 0 ? (
                  <div className="p-2 text-gray-500 text-center text-xs">
                    {costCodeSearch ? 'No cost codes found matching your search' : 'No cost codes available'}
                  </div>
                ) : (
                  filteredCostCodes.map((costCode) => (
                    <div
                      key={costCode.id}
                      className="p-2 border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleCostCodeToggle(costCode.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedCostCodes.includes(costCode.id)}
                          onCheckedChange={() => handleCostCodeToggle(costCode.id)}
                        />
                        <div className="text-xs">
                          <span className="font-medium">{costCode.code}</span> - {costCode.name}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <FormLabel>Associated Representatives</FormLabel>
              
              {/* Selected representatives */}
              {selectedRepresentatives.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                  {selectedRepresentatives.map(representativeId => {
                    const representative = representatives.find(rep => rep.id === representativeId);
                    return representative ? (
                      <Badge key={representativeId} variant="secondary" className="flex items-center gap-1 text-xs">
                        {representative.first_name} {representative.last_name}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeRepresentative(representativeId)}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search representatives by name..."
                  value={representativeSearch}
                  onChange={(e) => setRepresentativeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Representative selection */}
              <div className="max-h-24 overflow-y-auto border rounded-md">
                {filteredRepresentatives.length === 0 ? (
                  <div className="p-2 text-gray-500 text-center text-xs">
                    {representativeSearch ? 'No representatives found matching your search' : 'No representatives available'}
                  </div>
                ) : (
                  filteredRepresentatives.map((representative) => (
                    <div
                      key={representative.id}
                      className="p-2 border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRepresentativeToggle(representative.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedRepresentatives.includes(representative.id)}
                          onCheckedChange={() => handleRepresentativeToggle(representative.id)}
                        />
                        <div className="text-xs">
                          {representative.first_name} {representative.last_name}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCompanyMutation.isPending}>
                {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
