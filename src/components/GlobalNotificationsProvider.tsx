import { ReactNode, createContext, useContext } from "react";
import { useChatNotifications } from "@/hooks/useChatNotifications";

interface GlobalNotificationsContextType {
  unreadCounts: { [roomId: string]: number };
  totalUnread: number;
  markRoomAsRead: (roomId: string) => Promise<void>;
  loadUnreadCounts: () => Promise<void>;
}

const GlobalNotificationsContext = createContext<GlobalNotificationsContextType>({
  unreadCounts: {},
  totalUnread: 0,
  markRoomAsRead: async () => {},
  loadUnreadCounts: async () => {},
});

export const useGlobalNotifications = () => useContext(GlobalNotificationsContext);

interface GlobalNotificationsProviderProps {
  children: ReactNode;
}

export function GlobalNotificationsProvider({ children }: GlobalNotificationsProviderProps) {
  const notificationData = useChatNotifications();
  
  return (
    <GlobalNotificationsContext.Provider value={notificationData}>
      {children}
    </GlobalNotificationsContext.Provider>
  );
}