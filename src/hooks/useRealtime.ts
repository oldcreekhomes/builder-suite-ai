import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from './useCompanyUsers';

export const useRealtime = (
  selectedUser: User | null,
  fetchMessages: (otherUserId: string) => Promise<void>
) => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastMessageCountRef = useRef<number>(0);

  // Set up both real-time subscription AND polling as backup
  useEffect(() => {
    if (!selectedUser) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    console.log('Setting up real-time messaging for user:', selectedUser.id);

    // Real-time subscription (primary method)
    const channel = supabase
      .channel(`messages_${Date.now()}`) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_chat_messages'
        },
        async (payload) => {
          console.log('Real-time change detected:', payload.eventType);
          await fetchMessages(selectedUser.id);
        }
      )
      .subscribe(async (status) => {
        console.log('Subscription status:', status);
      });

    // Polling backup (ensures messages always update)
    const pollForMessages = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_chat_messages')
          .select('id')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id})`)
          .eq('is_deleted', false);

        if (!error && data) {
          const currentCount = data.length;
          if (currentCount !== lastMessageCountRef.current) {
            console.log('Message count changed, refreshing...');
            lastMessageCountRef.current = currentCount;
            await fetchMessages(selectedUser.id);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 2 seconds as backup
    intervalRef.current = setInterval(pollForMessages, 2000);
    
    // Initial count
    pollForMessages();

    return () => {
      console.log('Cleaning up real-time subscription and polling');
      supabase.removeChannel(channel);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedUser, fetchMessages]);
};