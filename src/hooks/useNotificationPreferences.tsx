import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  sound_notifications_enabled: boolean;
  toast_notifications_enabled: boolean;
  receive_bill_payment_alerts: boolean;
  can_access_accounting: boolean;
  can_access_manage_bills: boolean;
  can_access_transactions: boolean;
  can_access_reports: boolean;
  can_access_employees: boolean;
  can_close_books: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id'> = {
  sound_notifications_enabled: true,
  toast_notifications_enabled: true,
  receive_bill_payment_alerts: false,
  can_access_accounting: false,
  can_access_manage_bills: false,
  can_access_transactions: false,
  can_access_reports: false,
  can_access_employees: false,
  can_close_books: false,
};

export const useNotificationPreferences = (userId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        throw error;
      }

      // If no preferences exist, create them with defaults
      if (!data) {
        const defaultData = {
          ...defaultPreferences,
          user_id: targetUserId,
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('user_notification_preferences')
          .insert(defaultData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default notification preferences:', insertError);
          // Return defaults without saving if insert fails
          return defaultData;
        }

        return insertedData;
      }

      return data;
    },
    enabled: !!targetUserId,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      if (!targetUserId) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_notification_preferences')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingData) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .update(newPreferences)
          .eq('user_id', targetUserId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new preferences (this should rarely happen now due to auto-creation)
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .insert({
            ...defaultPreferences,
            ...newPreferences,
            user_id: targetUserId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', targetUserId] });
      toast({
        title: "Access Level Saved",
      });
    },
    onError: (error) => {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    updatePreferencesMutation.mutate(newPreferences);
  };

  return {
    preferences: preferences || { ...defaultPreferences, user_id: targetUserId || '' },
    isLoading,
    error,
    updatePreferences,
    isUpdating: updatePreferencesMutation.isPending,
  };
};