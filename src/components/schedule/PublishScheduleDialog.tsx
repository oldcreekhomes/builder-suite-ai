import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  daysFromToday: z.string().min(1, "Please enter number of days"),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PublishScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (data: FormData) => void;
}

export function PublishScheduleDialog({
  open,
  onOpenChange,
  onPublish,
}: PublishScheduleDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daysFromToday: "",
      message: "",
    },
  });

  

  const handleSubmit = (data: FormData) => {
    onPublish(data);
    onOpenChange(false);
    form.reset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Schedule</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="daysFromToday"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-3">
                    <Label>Notifications will be sent to all resources with tasks in the next:</Label>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="7"
                          className="w-20"
                          min="1"
                        />
                      </FormControl>
                      <Label>weeks</Label>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any additional information about this schedule update..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">Send</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}