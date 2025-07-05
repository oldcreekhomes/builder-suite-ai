
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEffect } from "react";

const representativeSchema = z.object({
  marketplace_company_id: z.string().min(1, "Company is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  title: z.string().optional(),
  is_primary: z.boolean().default(false),
});

type RepresentativeFormData = z.infer<typeof representativeSchema>;

interface MarketplaceRepresentativeWithCompany {
  id: string;
  marketplace_company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  is_primary?: boolean;
  marketplace_companies: {
    company_name: string;
    company_type: string;
  };
}

interface EditMarketplaceRepresentativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative: MarketplaceRepresentativeWithCompany | null;
}

export function EditMarketplaceRepresentativeDialog({ 
  open, 
  onOpenChange, 
  representative 
}: EditMarketplaceRepresentativeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RepresentativeFormData>({
    resolver: zodResolver(representativeSchema),
    defaultValues: {
      marketplace_company_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      title: "",
      is_primary: false,
    },
  });

  const { data: marketplaceCompanies = [] } = useQuery({
    queryKey: ['marketplace-companies-for-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_companies')
        .select('id, company_name')
        .order('company_name');
      
      if (error) throw error;
      return data;
    },
  });

  const updateRepresentativeMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      if (!representative) throw new Error("No representative selected");
      
      const { error } = await supabase
        .from('marketplace_company_representatives')
        .update({
          marketplace_company_id: data.marketplace_company_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone_number: data.phone_number || null,
          title: data.title || null,
          is_primary: data.is_primary,
        })
        .eq('id', representative.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-representatives'] });
      toast({
        title: "Success",
        description: "Marketplace representative updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating marketplace representative:', error);
      toast({
        title: "Error",
        description: "Failed to update marketplace representative",
        variant: "destructive",
      });
    },
  });

  // Auto-populate form when representative changes
  useEffect(() => {
    if (representative && open) {
      form.reset({
        marketplace_company_id: representative.marketplace_company_id,
        first_name: representative.first_name,
        last_name: representative.last_name,
        email: representative.email || "",
        phone_number: representative.phone_number || "",
        title: representative.title || "",
        is_primary: representative.is_primary || false,
      });
    }
  }, [representative, open, form]);

  const onSubmit = (data: RepresentativeFormData) => {
    updateRepresentativeMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Marketplace Representative</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="marketplace_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {marketplaceCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Input placeholder="Enter email address" {...field} />
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Estimator">Estimator</SelectItem>
                      <SelectItem value="Foreman">Foreman</SelectItem>
                      <SelectItem value="Project Manager">Project Manager</SelectItem>
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

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
