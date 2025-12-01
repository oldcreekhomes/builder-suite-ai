import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UnreadCounts {
  [userId: string]: number;
}

export const useChatNotifications = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenMessageIdsRef = useRef(new Set<string>());

  // Fetch initial unread counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all unread messages grouped by sender
      const { data, error } = await supabase
        .from('user_chat_messages')
        .select('sender_id')
        .eq('recipient_id', user.id)
        .is('read_at', null)
        .eq('is_deleted', false);

      if (error) {
        console.error('💬 ChatNotifications: Error fetching unread counts:', error);
        return;
      }

      // Group by sender_id and count
      const counts: UnreadCounts = {};
      data?.forEach(msg => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });

      setUnreadCounts(counts);
      console.log('💬 ChatNotifications: Fetched unread counts:', counts);
    } catch (error) {
      console.error('💬 ChatNotifications: Error:', error);
    }
  }, [user?.id]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (otherUserId: string) => {
    if (!user?.id) return;

    try {
      await supabase.rpc('mark_conversation_as_read', {
        other_user_id_param: otherUserId,
      });

      setUnreadCounts(prev => ({ ...prev, [otherUserId]: 0 }));
      console.log('💬 ChatNotifications: Marked as read:', otherUserId);

      // Sync across tabs
      try {
        const bc = new BroadcastChannel('chat-unread-sync');
        bc.postMessage({ type: 'mark-read', userId: otherUserId });
        bc.close();
      } catch (e) {
        // BroadcastChannel not available
      }
    } catch (error) {
      console.error('💬 ChatNotifications: Error marking as read:', error);
    }
  }, [user?.id]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial counts
    fetchUnreadCounts();

    // Subscribe to new messages (INSERT) and read status changes (UPDATE)
    const channel = supabase.channel(`chat-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const message = payload.new as any;
          const senderId = message.sender_id;

          // Deduplicate
          if (seenMessageIdsRef.current.has(message.id)) return;
          seenMessageIdsRef.current.add(message.id);

          console.log('💬 ChatNotifications: New message from:', senderId);

          // Update unread count
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const oldMsg = payload.old as any;
          const newMsg = payload.new as any;
          
          // If message was just marked as read, refresh counts
          if (oldMsg.read_at === null && newMsg.read_at !== null) {
            console.log('💬 ChatNotifications: Message marked as read, refreshing counts');
            fetchUnreadCounts();
          }
        }
      )
      .subscribe((status, error) => {
        console.log('💬 ChatNotifications: Channel status:', status);
        if (error) {
          console.error('💬 ChatNotifications: Subscription error:', error);
        }
        if (status === 'SUBSCRIBED') {
          console.log('💬 ChatNotifications: Successfully subscribed to realtime updates');
          // Fetch fresh counts after successful subscription
          fetchUnreadCounts();
        }
      });

    channelRef.current = channel;

    // Polling fallback - ensures badges update even if realtime fails
    const pollInterval = setInterval(() => {
      fetchUnreadCounts();
    }, 15000); // Every 15 seconds

    // Listen for cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('chat-unread-sync');
      bc.onmessage = (event) => {
        if (event.data.type === 'mark-read') {
          setUnreadCounts(prev => ({ ...prev, [event.data.userId]: 0 }));
        }
      };
    } catch (e) {
      // BroadcastChannel not available
    }

    // Refetch on visibility change
    const handleVisibility = () => {
      if (!document.hidden) fetchUnreadCounts();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (bc) bc.close();
      seenMessageIdsRef.current.clear();
    };
  }, [user?.id, fetchUnreadCounts]);

  return {
    unreadCounts,
    markConversationAsRead,
    refetchUnreadCounts: fetchUnreadCounts,
  };
};
