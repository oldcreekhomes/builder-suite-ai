import { useState, useCallback, useEffect } from 'react';
import { FloatingChatWindow } from './FloatingChatWindow';
import { User } from '@/hooks/useCompanyUsers';

interface ChatWindow {
  user: User;
  isMinimized: boolean;
}

interface FloatingChatManagerProps {
  onOpenChat?: (manager: { openChat: (user: User) => void }) => void;
}

export function FloatingChatManager({ onOpenChat }: FloatingChatManagerProps) {
  const [chatWindows, setChatWindows] = useState<Map<string, ChatWindow>>(new Map());

  const openChat = useCallback((user: User) => {
    console.log('FloatingChatManager: openChat called with user:', user);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.set(user.id, { user, isMinimized: false });
      console.log('FloatingChatManager: Updated chat windows, total count:', newWindows.size);
      return newWindows;
    });
  }, []);

  const closeChat = useCallback((userId: string) => {
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.delete(userId);
      return newWindows;
    });
  }, []);

  const toggleMinimize = useCallback((userId: string) => {
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
    const windowWidth = isMinimized ? 256 : 320; // w-64 = 256px, w-80 = 320px
    const spacing = 16;
    return (windowWidth + spacing) * index;
  };

  const chatWindowsArray = Array.from(chatWindows.entries());

  // Register the openChat function with the parent
  useEffect(() => {
    onOpenChat?.({ openChat });
  }, [onOpenChat, openChat]);

  return (
    <>
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
    </>
  );
}

// Export the hook to open chats from other components
export const useFloatingChat = () => {
  const [chatManager, setChatManager] = useState<{ openChat: (user: User) => void } | null>(null);

  const registerChatManager = useCallback((manager: { openChat: (user: User) => void }) => {
    console.log('useFloatingChat: registerChatManager called with manager:', manager);
    setChatManager(manager);
  }, []);

  const openFloatingChat = useCallback((user: User) => {
    console.log('useFloatingChat: openFloatingChat called with user:', user);
    console.log('useFloatingChat: chatManager is:', chatManager);
    if (chatManager) {
      chatManager.openChat(user);
    } else {
      console.error('useFloatingChat: chatManager is null, cannot open chat');
    }
  }, [chatManager]);

  return {
    registerChatManager,
    openFloatingChat
  };
};