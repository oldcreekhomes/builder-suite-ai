import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadCounts {
  [userId: string]: number;
}

export const useUnreadCounts = (userIds: string[]) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchUnreadCounts = async () => {
    if (!user?.id || userIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    setIsLoading(true);
    try {
      const counts: UnreadCounts = {};
      
      // Fetch unread count for each user
      for (const userId of userIds) {
        const { data, error } = await supabase.rpc('get_conversation_unread_count', {
          other_user_id_param: userId
        });

        if (error) {
          console.error('Error fetching unread count for user:', userId, error);
          counts[userId] = 0;
        } else {
          counts[userId] = data || 0;
        }
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [user?.id, userIds.join(',')]);

  // Set up real-time updates for new messages
  useEffect(() => {
    if (!user?.id || userIds.length === 0) return;

    // Create a unique channel name to avoid conflicts
    const channelName = `unread_counts_${user.id}_${userIds.join('_')}_${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages'
        },
        (payload) => {
          const messageData = payload.new;
          if (!messageData) return;

          const senderId = messageData.sender_id;
          const recipientId = messageData.recipient_id;

          // Update count if this message is for the current user
          if (recipientId === user.id && userIds.includes(senderId)) {
            setUnreadCounts(prev => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_chat_messages'
        },
        (payload) => {
          const messageData = payload.new;
          if (!messageData) return;

          const senderId = messageData.sender_id;
          const recipientId = messageData.recipient_id;

          // If a message was read (read_at changed), refresh the count
          if (recipientId === user.id && userIds.includes(senderId)) {
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, userIds.join(',')]);

  const markConversationAsRead = async (otherUserId: string) => {
    try {
      await supabase.rpc('mark_conversation_as_read', {
        other_user_id_param: otherUserId
      });
      
      // Update local state immediately
      setUnreadCounts(prev => ({
        ...prev,
        [otherUserId]: 0
      }));
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    unreadCounts,
    isLoading,
    markConversationAsRead,
    refreshCounts: fetchUnreadCounts
  };
};