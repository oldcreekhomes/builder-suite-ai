import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from './useCompanyUsers';

export const useRealtime = (
  selectedUser: User | null,
  fetchMessages: (otherUserId: string) => Promise<void>
) => {
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);

  useEffect(() => {
    const setupRealtime = async () => {
      if (!selectedUser) {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      currentUserRef.current = user.id;

      // Create a consistent channel name based on the two users
      const channelName = [user.id, selectedUser.id].sort().join('_');
      
      console.log('Setting up real-time subscription for conversation:', channelName);

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Set up real-time subscription with proper filtering
      channelRef.current = supabase
        .channel(`conversation_${channelName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_chat_messages',
            filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${user.id}))`
          },
          async (payload) => {
            console.log('Real-time message change:', payload.eventType, payload.new || payload.old);
            
            // Only fetch messages if this is relevant to current conversation
            if (selectedUser && currentUserRef.current) {
              await fetchMessages(selectedUser.id);
            }
          }
        )
        .subscribe((status) => {
          console.log('Real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time messaging active');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out - retrying...');
            // Auto-retry after a brief delay
            setTimeout(() => setupRealtime(), 1000);
          } else if (status === 'CLOSED') {
            console.log('Real-time subscription closed');
          }
        });
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up real-time subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedUser, fetchMessages]);
};