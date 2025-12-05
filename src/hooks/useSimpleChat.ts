import { useCallback, useEffect, useRef } from 'react';
import { useCompanyUsers, User } from './useCompanyUsers';
import { useMessages, ChatMessage } from './useMessages';
import { useSendMessage } from './useSendMessage';
import { useChatRooms } from './useChatRooms';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Re-export interfaces for backwards compatibility
export type { User, ChatMessage };

export const useSimpleChat = () => {
  // Use focused hooks
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { messages, isLoadingMessages, fetchMessages, setMessages, addMessage, clearMessages } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { 
    selectedUser, 
    setSelectedUser, 
    startChatWithUser: startChatWithUserHook,
    markConversationAsRead 
  } = useChatRooms();

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Simple realtime subscription for active conversation messages
  useEffect(() => {
    if (!currentUserId || !selectedUser?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`chat-messages-${currentUserId}-${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Debug logging to identify comparison issues
          console.log('💬 Chat: Message received via realtime', {
            messageId: message?.id,
            messageSenderId: message?.sender_id,
            expectedUserId: selectedUser.id,
            match: message?.sender_id === selectedUser.id,
            senderIdType: typeof message?.sender_id,
            userIdType: typeof selectedUser.id
          });
          
          // Validate essential fields exist to prevent crashes
          if (!message?.id || !message?.sender_id) {
            console.warn('💬 Chat: Received invalid message payload, skipping:', message);
            return;
          }
          
          // Only add if from the selected user
          if (message.sender_id === selectedUser.id) {
            console.log('💬 Chat: Sender matched, adding message');
            
            // Fetch sender info to enrich the message (prevents white-out screens)
            const { data: sender } = await supabase
              .from('users')
              .select('first_name, last_name, avatar_url')
              .eq('id', message.sender_id)
              .maybeSingle();

            const enrichedMessage = {
              ...message,
              sender_name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
              sender_avatar: sender?.avatar_url || null,
              created_at: message.created_at || new Date().toISOString() // Fallback for missing timestamp
            };

            addMessage(enrichedMessage);
          } else {
            console.log('💬 Chat: Sender did NOT match, skipping message');
          }
        }
      )
      .subscribe((status, error) => {
        console.log('💬 Chat: Channel status:', status);
        if (status === 'SUBSCRIBED') {
          // Refresh messages when subscription connects/reconnects
          fetchMessages(selectedUser.id, true);
        }
        if (error) {
          console.error('💬 Chat: Subscription error:', error);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, selectedUser?.id, addMessage, fetchMessages]);

  // Polling fallback - refresh messages every 10 seconds as backup for unreliable WebSocket
  useEffect(() => {
    if (!selectedUser?.id) return;
    
    const interval = setInterval(() => {
      console.log('💬 Chat: Polling for messages');
      fetchMessages(selectedUser.id, true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [selectedUser?.id, fetchMessages]);

  // Visibility change handler - refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedUser?.id) {
        console.log('💬 Chat: Tab became visible, refreshing messages');
        fetchMessages(selectedUser.id, true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedUser?.id, fetchMessages]);

  // Enhanced start chat function that also fetches messages
  const startChatWithUser = useCallback(async (user: User) => {
    try {
      console.log('Starting chat with user:', user);
      
      // Always clear messages first to ensure clean state
      clearMessages();
      
      const userId = await startChatWithUserHook(user);
      if (userId) {
        // Always force refresh to ensure we get the latest messages
        await fetchMessages(userId, true);
      }
    } catch (error) {
      console.error('Error in startChatWithUser:', error);
    }
  }, [startChatWithUserHook, fetchMessages, clearMessages]);

  // Enhanced send message function
  const sendMessage = useCallback(async (messageText: string, files: File[] = []) => {
    await sendMessageHook(messageText, selectedUser, setMessages, files);
  }, [sendMessageHook, selectedUser, setMessages]);

  return {
    users,
    messages,
    selectedRoom: selectedUser, // For backwards compatibility
    currentUserId,
    isLoading,
    isLoadingMessages,
    setSelectedRoom: setSelectedUser, // For backwards compatibility
    startChatWithUser,
    startChatWithEmployee: startChatWithUser, // Alias for backwards compatibility
    sendMessage,
    fetchMessages,
    markRoomAsRead: markConversationAsRead // For backwards compatibility
  };
};
