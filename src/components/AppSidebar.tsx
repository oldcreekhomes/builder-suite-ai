
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/ui/sidebar";
import { SidebarBranding } from "./sidebar/SidebarBranding";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarUserDropdown } from "./sidebar/SidebarUserDropdown";
import { MessagesSidebar } from "./sidebar/MessagesSidebar";

interface AppSidebarProps {
  selectedRoom?: any;
  onRoomSelect?: (room: any) => void;
  onStartChat?: (employee: any) => void;
}

export function AppSidebar({ selectedRoom, onRoomSelect, onStartChat }: AppSidebarProps) {
  const location = useLocation();
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarBranding />
      {isMessagesPage ? (
        <MessagesSidebar 
          selectedRoom={selectedRoom || null}
          onRoomSelect={onRoomSelect || (() => {})}
          onStartChat={onStartChat || (() => {})}
        />
      ) : (
        <SidebarNavigation />
      )}
      <SidebarUserDropdown />
    </Sidebar>
  );
}
