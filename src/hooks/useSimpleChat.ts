import { useCallback } from 'react';
import { useCompanyUsers, User } from './useCompanyUsers';
import { useMessages, ChatMessage } from './useMessages';
import { useSendMessage } from './useSendMessage';
import { useChatRooms } from './useChatRooms';
import { useRealtime } from './useRealtime';
import { useGlobalChatNotifications } from './useGlobalChatNotifications';

// Re-export interfaces for backwards compatibility
export type { User, ChatMessage };

export const useSimpleChat = () => {
  // Use focused hooks
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { messages, isLoadingMessages, fetchMessages, setMessages, addMessage, clearMessages, currentConversationUserId } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { 
    selectedUser, 
    setSelectedUser, 
    startChatWithUser: startChatWithUserHook,
    markConversationAsRead 
  } = useChatRooms();

  // Set up real-time subscription
  useRealtime(selectedUser, addMessage);
  
  // Set up global chat notifications (skip notifications for active conversation)
  useGlobalChatNotifications(selectedUser?.id || null);

  // Enhanced start chat function that also fetches messages
  const startChatWithUser = useCallback(async (user: User) => {
    try {
      console.log('Starting chat with user:', user);
      console.log('Current conversation user ID:', currentConversationUserId);
      
      // Always clear messages first to ensure clean state
      clearMessages();
      
      const userId = await startChatWithUserHook(user);
      console.log('Start chat returned userId:', userId);
      if (userId) {
        console.log('Fetching messages for userId:', userId, 'with force refresh');
        // Always force refresh to ensure we get the latest messages
        await fetchMessages(userId, true);
        console.log('Messages fetched successfully');
      } else {
        console.error('Failed to get userId from startChatWithUserHook');
      }
    } catch (error) {
      console.error('Error in startChatWithUser:', error);
    }
  }, [startChatWithUserHook, fetchMessages, clearMessages, currentConversationUserId]);

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