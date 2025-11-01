import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '@/hooks/useCompanyUsers';
import { useMasterChatRealtime } from '@/hooks/useMasterChatRealtime';
import { FloatingChatWindow } from '@/components/chat/FloatingChatWindow';

interface ChatWindow {
  user: User;
  isMinimized: boolean;
}

interface ChatContextType {
  unreadCounts: Record<string, number>;
  connectionState: string;
  markConversationAsRead: (userId: string) => Promise<void>;
  openChat: (user: User) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [chatWindows, setChatWindows] = useState<Map<string, ChatWindow>>(new Map());

  // Get currently active conversation (first non-minimized chat or null)
  const activeConversationUserId = Array.from(chatWindows.values())
    .find(chat => !chat.isMinimized)?.user?.id || null;

  const openChat = useCallback((user: User) => {
    console.log('💬 ChatContext: Opening chat for user:', user.id);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.set(user.id, { user, isMinimized: false });
      return newWindows;
    });
  }, []);

  // Set up master real-time notifications
  const { unreadCounts, connectionState, markConversationAsRead } = useMasterChatRealtime(
    activeConversationUserId,
    {
      onNotificationTrigger: (sender, message) => {
        console.log('💬 ChatContext: Opening chat from notification for user:', sender.id);
        openChat(sender);
      }
    },
    { enableNotifications: true, notifyWhileActive: true }
  );

  const closeChat = useCallback((userId: string) => {
    console.log('💬 ChatContext: Closing chat for user:', userId);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.delete(userId);
      return newWindows;
    });
  }, []);

  const toggleMinimize = useCallback((userId: string) => {
    console.log('💬 ChatContext: Toggling minimize for user:', userId);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      const chatWindow = newWindows.get(userId);
      if (chatWindow) {
        newWindows.set(userId, { ...chatWindow, isMinimized: !chatWindow.isMinimized });
      }
      return newWindows;
    });
  }, []);

  // Calculate positions for multiple chat windows
  const getWindowPosition = (index: number, isMinimized: boolean) => {
    const windowWidth = isMinimized ? 256 : 320;
    const spacing = 16;
    return (windowWidth + spacing) * index;
  };

  const chatWindowsArray = Array.from(chatWindows.entries());

  const value: ChatContextType = {
    unreadCounts,
    connectionState,
    markConversationAsRead,
    openChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      {chatWindowsArray.map(([userId, chatWindow], index) => (
        <FloatingChatWindow
          key={userId}
          user={chatWindow.user}
          onClose={() => closeChat(userId)}
          onMinimize={() => toggleMinimize(userId)}
          isMinimized={chatWindow.isMinimized}
          position={{ right: 16 + getWindowPosition(index, chatWindow.isMinimized) }}
        />
      ))}
    </ChatContext.Provider>
  );
};
