import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/ui/sidebar";
import { SidebarBranding } from "./sidebar/SidebarBranding";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarUserDropdown } from "./sidebar/SidebarUserDropdown";
import { MessagesSidebar } from "./sidebar/MessagesSidebar";

interface AppSidebarProps {
  selectedUser?: any;
  onUserSelect?: (user: any) => void;
  onStartChat?: (user: any) => void;
}

export function AppSidebar({ selectedUser, onUserSelect, onStartChat }: AppSidebarProps) {
  const location = useLocation();
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');
  const isCompanyDashboard = location.pathname === '/';

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarBranding />
      {(isMessagesPage || isCompanyDashboard) ? (
        <MessagesSidebar 
          selectedUser={selectedUser || null}
          onUserSelect={onUserSelect}
          onStartChat={onStartChat}
        />
      ) : (
        <SidebarNavigation />
      )}
      <SidebarUserDropdown />
    </Sidebar>
  );
}