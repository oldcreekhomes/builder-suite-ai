
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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

const representativeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  company_id: z.string().min(1, "Company is required"),
  title: z.enum(["estimator", "project manager", "foreman"]),
  is_primary: z.boolean().default(false),
});

type RepresentativeFormData = z.infer<typeof representativeSchema>;

interface AddRepresentativeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepresentativeModal({ open, onOpenChange }: AddRepresentativeModalProps) {
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
      company_id: "",
      title: "estimator",
      is_primary: false,
    },
  });

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

  const createRepresentativeMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const representativeData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone_number: data.phone_number || null,
        company_id: data.company_id,
        title: data.title,
        is_primary: data.is_primary,
      };

      const { data: representative, error } = await supabase
        .from('company_representatives')
        .insert(representativeData)
        .select()
        .single();
      
      if (error) throw error;
      return representative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representatives'] });
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
      toast({
        title: "Success",
        description: "Representative created successfully",
      });
      form.reset();
      setCompanySearch("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating representative:', error);
      toast({
        title: "Error",
        description: "Failed to create representative",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepresentativeFormData) => {
    createRepresentativeMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setCompanySearch("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Representative</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search companies..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCompanies.length === 0 ? (
                          <div className="p-2 text-gray-500 text-center text-sm">
                            {companySearch ? 'No companies found matching your search' : 'No companies available'}
                          </div>
                        ) : (
                          filteredCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.company_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select representative type" />
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

            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Primary Representative</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRepresentativeMutation.isPending}>
                {createRepresentativeMutation.isPending ? "Creating..." : "Create Representative"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
