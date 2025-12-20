import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  browser_notifications_enabled: boolean;
  receive_bill_payment_alerts: boolean;
  can_access_accounting: boolean;
  can_access_manage_bills: boolean;
  can_access_transactions: boolean;
  can_access_reports: boolean;
  can_access_employees: boolean;
  can_close_books: boolean;
  can_lock_budgets: boolean;
  can_undo_reconciliation: boolean;
  can_edit_projects: boolean;
  can_access_pm_dashboard: boolean;
  can_access_owner_dashboard: boolean;
  can_access_estimate: boolean;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id'> = {
  browser_notifications_enabled: false,
  receive_bill_payment_alerts: false,
  can_access_accounting: false,
  can_access_manage_bills: false,
  can_access_transactions: false,
  can_access_reports: false,
  can_access_employees: false,
  can_close_books: false,
  can_lock_budgets: false,
  can_undo_reconciliation: false,
  can_edit_projects: false,
  can_access_pm_dashboard: true,
  can_access_owner_dashboard: false,
  can_access_estimate: false,
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
        // Check if this user is an owner to set appropriate defaults
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId)
          .eq('role', 'owner')
          .maybeSingle();
        
        const isOwner = !!roleData;
        
        // Owners get all permissions enabled by default
        const ownerPermissions = isOwner ? {
          can_access_accounting: true,
          can_access_manage_bills: true,
          can_access_transactions: true,
          can_access_reports: true,
          can_access_employees: true,
          can_close_books: true,
          can_lock_budgets: true,
          can_undo_reconciliation: true,
          can_edit_projects: true,
          can_access_pm_dashboard: true,
          can_access_owner_dashboard: true,
          can_access_estimate: true,
        } : {};

        const defaultData = {
          ...defaultPreferences,
          ...ownerPermissions,
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

  // Create a unique channel ID for this hook instance to avoid subscription collisions
  const channelIdRef = useRef(`preferences-${targetUserId}-${Math.random().toString(36).substring(7)}`);

  // Subscribe to realtime changes for this user's preferences
  useEffect(() => {
    if (!targetUserId) return;

    // Update the channel ID if targetUserId changes
    channelIdRef.current = `preferences-${targetUserId}-${Math.random().toString(36).substring(7)}`;

    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notification_preferences',
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          console.log('Preferences changed via realtime:', payload);
          queryClient.invalidateQueries({ 
            queryKey: ['notification-preferences', targetUserId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, queryClient]);

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