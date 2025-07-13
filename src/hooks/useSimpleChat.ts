import { useCallback } from 'react';
import { useCompanyUsers, User } from './useCompanyUsers';
import { useMessages, ChatMessage } from './useMessages';
import { useSendMessage } from './useSendMessage';
import { useChatRooms } from './useChatRooms';
import { useRealtime } from './useRealtime';

// Re-export interfaces for backwards compatibility
export type { User, ChatMessage };

export const useSimpleChat = () => {
  // Use focused hooks
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { messages, isLoadingMessages, fetchMessages, setMessages } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { 
    selectedUser, 
    setSelectedUser, 
    startChatWithUser: startChatWithUserHook,
    markConversationAsRead 
  } = useChatRooms();

  // Set up real-time subscription
  useRealtime(selectedUser, fetchMessages);

  // Enhanced start chat function that also fetches messages
  const startChatWithUser = useCallback(async (user: User) => {
    const userId = await startChatWithUserHook(user);
    if (userId) {
      await fetchMessages(userId);
    }
  }, [startChatWithUserHook, fetchMessages]);

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