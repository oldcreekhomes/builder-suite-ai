import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UnreadCounts {
  [userId: string]: number;
}

export const useUnreadCounts = (userIds: string[]) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const userIdsRef = useRef<string[]>(userIds);
  const currentUserRef = useRef<string | null>(null);

  // Update refs when values change
  userIdsRef.current = userIds;

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
          console.error('📧 Error fetching unread count for user:', userId, error);
          counts[userId] = 0;
        } else {
          counts[userId] = data || 0;
        }
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('📧 Error fetching unread counts:', error);
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

    let isCleanedUp = false;
    let channel: any = null;
    let isSubscribed = false;
    
    const setupSubscription = async () => {
      try {
        currentUserRef.current = user.id;
        
        console.log('🔥 useUnreadCounts: Setting up subscription for userIds:', userIds.length);

        // Create stable channel name to prevent multiple subscriptions
        const channelName = `unread_counts_${user.id}`;
        console.log('🔥 useUnreadCounts: Channel name:', channelName);
        
        channel = supabase.channel(channelName);
        
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_chat_messages'
            },
            (payload) => {
              if (isCleanedUp) return;
              
              const messageData = payload.new;
              if (!messageData || !currentUserRef.current) return;

              const senderId = messageData.sender_id;
              const recipientId = messageData.recipient_id;

              // Update count if this message is for the current user
              if (recipientId === currentUserRef.current && userIdsRef.current.includes(senderId)) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [senderId]: (prev[senderId] || 0) + 1
                }));
                console.log('🔥 useUnreadCounts: Updated count for sender:', senderId);
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
              if (isCleanedUp) return;
              
              const messageData = payload.new;
              if (!messageData || !currentUserRef.current) return;

              const senderId = messageData.sender_id;
              const recipientId = messageData.recipient_id;

              // If a message was read (read_at changed), refresh the count
              if (recipientId === currentUserRef.current && userIdsRef.current.includes(senderId)) {
                // Debounce the fetch to prevent rapid API calls
                setTimeout(() => {
                  if (isSubscribed && !isCleanedUp) {
                    fetchUnreadCounts();
                  }
                }, 200);
              }
            }
          );

        channel.subscribe((status) => {
          console.log('🔥 useUnreadCounts: Subscription status:', status, 'for channel:', channelName);
          isSubscribed = status === 'SUBSCRIBED';
          
          if (status === 'CHANNEL_ERROR' && !isCleanedUp) {
            console.warn('🔥 useUnreadCounts: Channel error, will retry on next effect cycle');
          }
          
          if (status === 'CLOSED' && !isCleanedUp) {
            console.warn('🔥 useUnreadCounts: Channel closed unexpectedly');
          }
        });
      } catch (error) {
        console.error('🔥 useUnreadCounts: Error setting up subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      console.log('🔥 useUnreadCounts: Cleaning up subscription');
      isCleanedUp = true;
      isSubscribed = false;
      if (channel) {
        // Use setTimeout to prevent DOM manipulation conflicts
        setTimeout(async () => {
          try {
            if (channel) {
              await supabase.removeChannel(channel);
            }
          } catch (error) {
            console.warn('🔥 useUnreadCounts: Error removing channel:', error);
          }
        }, 0);
      }
    };
  }, [user?.id, userIds.length]); // Use userIds.length instead of join to prevent unnecessary recreations

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