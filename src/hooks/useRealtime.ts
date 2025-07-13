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

    // Subscribe to all changes in user_chat_messages table
    const channel = supabase
      .channel('user_chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_chat_messages'
        },
        async (payload) => {
          console.log('Real-time payload received:', payload);
          
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if this message involves the current conversation
          const isRelevantMessage = 
            (newRecord && (
              (newRecord.sender_id === user.id && newRecord.recipient_id === selectedUser.id) ||
              (newRecord.sender_id === selectedUser.id && newRecord.recipient_id === user.id)
            )) ||
            (oldRecord && (
              (oldRecord.sender_id === user.id && oldRecord.recipient_id === selectedUser.id) ||
              (oldRecord.sender_id === selectedUser.id && oldRecord.recipient_id === user.id)
            ));
          
          if (isRelevantMessage) {
            console.log('Relevant message change detected, refreshing messages...');
            await fetchMessages(selectedUser.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
        } else if (status === 'TIMED_OUT') {
          console.error('Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('Real-time subscription closed');
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedUser, fetchMessages]);
};