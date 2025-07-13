import { useCallback } from 'react';
import { useCompanyUsers, User } from './useCompanyUsers';
import { useMessages, ChatMessage } from './useMessages';
import { useSendMessage } from './useSendMessage';
import { useChatRooms, ChatRoom } from './useChatRooms';
import { useRealtime } from './useRealtime';

// Re-export interfaces for backwards compatibility
export type { User, ChatMessage, ChatRoom };

export const useSimpleChat = () => {
  // Use focused hooks
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { messages, isLoadingMessages, fetchMessages, setMessages } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { 
    rooms, 
    selectedRoom, 
    setSelectedRoom, 
    startChatWithUser: startChatWithUserHook,
    markRoomAsRead 
  } = useChatRooms();

  // Set up real-time subscription
  useRealtime(selectedRoom, fetchMessages);

  // Enhanced start chat function that also fetches messages
  const startChatWithUser = useCallback(async (user: User) => {
    const roomId = await startChatWithUserHook(user);
    if (roomId) {
      await fetchMessages(roomId);
    }
  }, [startChatWithUserHook, fetchMessages]);

  // Enhanced send message function
  const sendMessage = useCallback(async (messageText: string, files: File[] = []) => {
    await sendMessageHook(messageText, selectedRoom, setMessages, files);
  }, [sendMessageHook, selectedRoom, setMessages]);

  return {
    users,
    rooms,
    messages,
    selectedRoom,
    currentUserId,
    isLoading,
    isLoadingMessages,
    setSelectedRoom,
    startChatWithUser,
    startChatWithEmployee: startChatWithUser, // Alias for backwards compatibility
    sendMessage,
    fetchMessages,
    markRoomAsRead
  };
};