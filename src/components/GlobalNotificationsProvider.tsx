import { ReactNode, createContext, useContext } from "react";
import { useChatNotifications } from "@/hooks/useChatNotifications";

interface ChatNotificationsContextType {
  unreadCounts: { [roomId: string]: number };
  totalUnread: number;
  markRoomAsRead: (roomId: string) => Promise<void>;
  loadUnreadCounts: () => Promise<void>;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextType | undefined>(undefined);

export function useChatNotificationsContext() {
  const context = useContext(ChatNotificationsContext);
  if (context === undefined) {
    throw new Error('useChatNotificationsContext must be used within a GlobalNotificationsProvider');
  }
  return context;
}

interface GlobalNotificationsProviderProps {
  children: ReactNode;
}

export function GlobalNotificationsProvider({ children }: GlobalNotificationsProviderProps) {
  const notifications = useChatNotifications();
  
  return (
    <ChatNotificationsContext.Provider value={notifications}>
      {children}
    </ChatNotificationsContext.Provider>
  );
}