import { useState, useCallback, useEffect } from 'react';
import { FloatingChatWindow } from './FloatingChatWindow';
import { User } from '@/hooks/useCompanyUsers';
import { useMasterChatRealtime } from '@/hooks/useMasterChatRealtime';

interface ChatWindow {
  user: User;
  isMinimized: boolean;
}

interface FloatingChatManagerProps {
  onOpenChat?: (manager: { openChat: (user: User) => void }) => void;
}

// Global reference to the chat manager
let globalChatManager: { openChat: (user: User) => void } | null = null;

export function FloatingChatManager({ onOpenChat }: FloatingChatManagerProps) {
  const [chatWindows, setChatWindows] = useState<Map<string, ChatWindow>>(new Map());

  // Get currently active conversation (first non-minimized chat or null)
  const activeConversationUserId = Array.from(chatWindows.values())
    .find(chat => !chat.isMinimized)?.user?.id || null;

  const openChat = useCallback((user: User) => {
    console.log('💬 FloatingChatManager: Opening chat for user:', user.id);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.set(user.id, { user, isMinimized: false });
      console.log('💬 FloatingChatManager: Updated chat windows, total count:', newWindows.size);
      return newWindows;
    });
  }, []);

  // Set up master real-time notifications
  // CRITICAL: This is the ONLY place where notifications are enabled globally
  // All other useMasterChatRealtime calls must have enableNotifications: false
  useMasterChatRealtime(activeConversationUserId, {
    onNotificationTrigger: (sender, message) => {
      console.log('💬 FloatingChatManager: Opening chat from notification for user:', sender.id);
      openChat(sender);
    }
  }, { enableNotifications: true, notifyWhileActive: true });

  const closeChat = useCallback((userId: string) => {
    console.log('💬 FloatingChatManager: Closing chat for user:', userId);
    setChatWindows(prev => {
      const newWindows = new Map(prev);
      newWindows.delete(userId);
      return newWindows;
    });
  }, []);

  const toggleMinimize = useCallback((userId: string) => {
    console.log('💬 FloatingChatManager: Toggling minimize for user:', userId);
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

  // Register the openChat function with the parent and globally
  useEffect(() => {
    const manager = { openChat };
    globalChatManager = manager;
    onOpenChat?.(manager);
    console.log('💬 FloatingChatManager: Registered chat manager globally and with parent');
    
    return () => {
      globalChatManager = null;
    };
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

// Export the function to open chats from other components
export const openFloatingChat = (user: User) => {
  console.log('💬 Global openFloatingChat called with user:', user);
  console.log('💬 Global chatManager is:', globalChatManager);
  if (globalChatManager) {
    globalChatManager.openChat(user);
  } else {
    console.error('💬 Global chatManager is not available');
  }
};

// Export the hook for backwards compatibility (but using global manager)
export const useFloatingChat = () => {
  const registerChatManager = useCallback((manager: { openChat: (user: User) => void }) => {
    console.log('💬 useFloatingChat: registerChatManager called with manager:', manager);
    globalChatManager = manager;
  }, []);

  const openFloatingChatHook = useCallback((user: User) => {
    console.log('💬 useFloatingChat: openFloatingChatHook called with user:', user);
    console.log('💬 useFloatingChat: About to call global openFloatingChat');
    openFloatingChat(user);
    console.log('💬 useFloatingChat: Global openFloatingChat called');
  }, []);

  return {
    registerChatManager,
    openFloatingChat: openFloatingChatHook
  };
};