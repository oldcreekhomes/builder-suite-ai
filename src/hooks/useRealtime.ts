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

    // Create a unique channel name for this conversation
    const channel = supabase
      .channel(`conversation_${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `or(and(sender_id.eq.${selectedUser.id}),and(recipient_id.eq.${selectedUser.id}))`
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          // Refresh messages when new message is inserted
          fetchMessages(selectedUser.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `or(and(sender_id.eq.${selectedUser.id}),and(recipient_id.eq.${selectedUser.id}))`
        },
        (payload) => {
          console.log('Message updated via realtime:', payload);
          // Refresh messages when message is updated (e.g., read status)
          fetchMessages(selectedUser.id);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedUser, fetchMessages]);
};