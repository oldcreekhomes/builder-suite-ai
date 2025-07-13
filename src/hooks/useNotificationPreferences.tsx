import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  browser_notifications_enabled: boolean;
  sound_notifications_enabled: boolean;
  toast_notifications_enabled: boolean;
  notification_sound: string;
  direct_message_notifications: boolean;
  group_message_notifications: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id'> = {
  browser_notifications_enabled: true,
  sound_notifications_enabled: true,
  toast_notifications_enabled: true,
  notification_sound: 'chime',
  direct_message_notifications: true,
  group_message_notifications: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        throw error;
      }

      // If no preferences exist, create them with defaults
      if (!data) {
        const defaultData = {
          ...defaultPreferences,
          user_id: user.id,
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
    enabled: !!user?.id,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .update(newPreferences)
          .eq('user_id', user.id)
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
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
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
    preferences: preferences || { ...defaultPreferences, user_id: user?.id || '' },
    isLoading,
    error,
    updatePreferences,
    isUpdating: updatePreferencesMutation.isPending,
  };
};