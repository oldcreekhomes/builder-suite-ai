
import { useEffect } from "react";
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
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";

const representativeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  title: z.string().optional(),
  service_areas: z.array(z.string()).min(1, "At least one service area is required"),
});

type RepresentativeFormData = z.infer<typeof representativeSchema>;

interface AddRepresentativeDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepresentativeDialog({ companyId, open, onOpenChange }: AddRepresentativeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch parent company's service areas to auto-populate
  const { data: parentCompany } = useQuery({
    queryKey: ['company-service-areas', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('service_areas')
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  const form = useForm<RepresentativeFormData>({
    resolver: zodResolver(representativeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      title: "",
      service_areas: [],
    },
  });

  const createRepresentativeMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      // Get current user's home_builder_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userDetails } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const homeBuilderIdToUse = userDetails?.home_builder_id || user.id;

      const { error } = await supabase
        .from('company_representatives')
        .insert({
          company_id: companyId,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone_number: data.phone_number || null,
          title: data.title || null,
          service_areas: data.service_areas,
          home_builder_id: homeBuilderIdToUse,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Success",
        description: "Representative added successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating representative:', error);
      toast({
        title: "Error",
        description: "Failed to add representative",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RepresentativeFormData) => {
    createRepresentativeMutation.mutate(data);
  };

  // Auto-populate service areas from parent company when dialog opens
  useEffect(() => {
    if (open && parentCompany?.service_areas?.length) {
      const current = form.getValues('service_areas');
      if (!current || current.length === 0) {
        form.setValue('service_areas', parentCompany.service_areas);
      }
    }
  }, [open, parentCompany, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Representative</DialogTitle>
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
                        <SelectItem value="Project Manager">Project Manager</SelectItem>
                        <SelectItem value="Foreman">Foreman</SelectItem>
                        <SelectItem value="Superintendent">Superintendent</SelectItem>
                        <SelectItem value="Sales Rep">Sales Rep</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Office Manager">Office Manager</SelectItem>
                        <SelectItem value="Accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_areas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Areas</FormLabel>
                    <div className="flex gap-4">
                      {SERVICE_AREA_OPTIONS.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(area)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, area]
                                  : current.filter((a: string) => a !== area)
                              );
                            }}
                          />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRepresentativeMutation.isPending}>
                {createRepresentativeMutation.isPending ? "Adding..." : "Add Representative"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
