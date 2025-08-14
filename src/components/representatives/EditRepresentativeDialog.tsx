
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

const representativeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, "Phone number must be in format xxx-xxx-xxxx")
    .optional()
    .or(z.literal("")),
  company_name: z.string().min(1, "Company is required"),
  title: z.enum(["estimator", "project manager", "foreman"]),
  receive_bid_notifications: z.boolean().default(false),
  receive_schedule_notifications: z.boolean().default(false),
  receive_po_notifications: z.boolean().default(false),
});

type RepresentativeFormData = z.infer<typeof representativeSchema>;

interface Representative {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  company_id: string;
  receive_bid_notifications?: boolean;
  receive_schedule_notifications?: boolean;
  receive_po_notifications?: boolean;
  companies: {
    company_name: string;
  };
}

interface EditRepresentativeDialogProps {
  representative: Representative | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRepresentativeDialog({ representative, open, onOpenChange }: EditRepresentativeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companySearch, setCompanySearch] = useState("");

  const form = useForm<RepresentativeFormData>({
    resolver: zodResolver(representativeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      company_name: "",
      title: "estimator",
      receive_bid_notifications: false,
      receive_schedule_notifications: false,
      receive_po_notifications: false,
    },
  });

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as xxx-xxx-xxxx
    if (digits.length >= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

  // Update form when representative changes
  useEffect(() => {
    if (representative) {
      form.reset({
        first_name: representative.first_name,
        last_name: representative.last_name,
        email: representative.email || "",
        phone_number: representative.phone_number || "",
        company_name: representative.companies?.company_name || "",
        title: (representative.title as "estimator" | "project manager" | "foreman") || "estimator",
        receive_bid_notifications: representative.receive_bid_notifications || false,
        receive_schedule_notifications: representative.receive_schedule_notifications || false,
        receive_po_notifications: representative.receive_po_notifications || false,
      });
      setCompanySearch("");
    }
  }, [representative, form]);

  // Fetch companies for selection
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Filter companies based on search
  const filteredCompanies = companies.filter(company => 
    company.company_name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const updateRepresentativeMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      if (!representative) throw new Error('No representative to update');

      // Find the company ID based on the selected company name
      const selectedCompany = companies.find(c => c.company_name === data.company_name);
      if (!selectedCompany) throw new Error('Company not found');

      const representativeData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone_number: data.phone_number || null,
        company_id: selectedCompany.id,
        title: data.title,
        receive_bid_notifications: data.receive_bid_notifications,
        receive_schedule_notifications: data.receive_schedule_notifications,
        receive_po_notifications: data.receive_po_notifications,
      };

      const { error } = await supabase
        .from('company_representatives')
        .update(representativeData)
        .eq('id', representative.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
      toast({
        title: "Success",
        description: "Representative updated successfully",
      });
      handleOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating representative:', error);
      toast({
        title: "Error",
        description: "Failed to update representative",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepresentativeFormData) => {
    updateRepresentativeMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setCompanySearch("");
    }
    onOpenChange(newOpen);
  };

  const handleCompanySelect = (companyName: string) => {
    form.setValue('company_name', companyName);
    setCompanySearch('');
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    form.setValue('phone_number', formatted);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Representative</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
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
                          <Input 
                            placeholder="xxx-xxx-xxxx" 
                            {...field}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="estimator">Estimator</SelectItem>
                            <SelectItem value="project manager">Project Manager</SelectItem>
                            <SelectItem value="foreman">Foreman</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            placeholder="Search and select company..."
                            value={companySearch || field.value}
                            onChange={(e) => setCompanySearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {companySearch && filteredCompanies.length > 0 && (
                          <div className="border rounded-md bg-white shadow-sm max-h-32 overflow-y-auto">
                            {filteredCompanies.map((company) => (
                              <div
                                key={company.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => handleCompanySelect(company.company_name)}
                              >
                                {company.company_name}
                              </div>
                            ))}
                          </div>
                        )}
                        {companySearch && filteredCompanies.length === 0 && (
                          <div className="border rounded-md bg-white shadow-sm p-3 text-gray-500 text-sm text-center">
                            No companies found matching your search
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <FormField
                  control={form.control}
                  name="receive_bid_notifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Receive Bid Notifications</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receive_schedule_notifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Receive Schedule Notifications</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receive_po_notifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Receive PO Notifications</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateRepresentativeMutation.isPending}>
                {updateRepresentativeMutation.isPending ? "Updating..." : "Update Representative"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

