import { ReactNode } from "react";
import { useChatNotifications } from "@/hooks/useChatNotifications";

interface GlobalNotificationsProviderProps {
  children: ReactNode;
}

export function GlobalNotificationsProvider({ children }: GlobalNotificationsProviderProps) {
  // Initialize global chat notifications
  useChatNotifications();
  
  return <>{children}</>;
}