import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Separator } from "@/components/ui/separator";

const representativeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone_number: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  receive_bid_notifications: z.boolean().default(false),
  receive_schedule_notifications: z.boolean().default(false),
  receive_po_notifications: z.boolean().default(false),
});

export type InlineRepresentativeData = z.infer<typeof representativeSchema>;

export interface PendingRepresentative extends InlineRepresentativeData {
  id: string; // temporary UUID for list key
}

interface InlineRepresentativeFormProps {
  onAdd: (data: InlineRepresentativeData) => void;
  onCancel: () => void;
}

export function InlineRepresentativeForm({ onAdd, onCancel }: InlineRepresentativeFormProps) {
  const form = useForm<InlineRepresentativeData>({
    resolver: zodResolver(representativeSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      title: "",
      receive_bid_notifications: false,
      receive_schedule_notifications: false,
      receive_po_notifications: false,
    },
  });

  const onSubmit = (data: InlineRepresentativeData) => {
    onAdd(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
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
              <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
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
        </div>

        <div className="pt-2">
          <Separator className="mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-3">Notifications</p>
          
          <div className="space-y-3">
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
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Add to Company
          </Button>
        </div>
      </form>
    </Form>
  );
}
