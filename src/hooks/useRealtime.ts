import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from './useCompanyUsers';

export const useRealtime = (
  selectedUser: User | null,
  fetchMessages: (otherUserId: string) => Promise<void>
) => {
  // Set up real-time subscription when user is selected
  useEffect(() => {
    if (!selectedUser) return;

    console.log('Setting up real-time subscription for user:', selectedUser.id);

    const channel = supabase
      .channel(`user_messages_${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages'
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          // Always refresh messages to show new message
          fetchMessages(selectedUser.id);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedUser, fetchMessages]);
};