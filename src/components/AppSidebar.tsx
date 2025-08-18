import { useLocation } from "react-router-dom";
import { Sidebar, SidebarSeparator } from "@/components/ui/sidebar";
import { SidebarBranding } from "./sidebar/SidebarBranding";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarUserDropdown } from "./sidebar/SidebarUserDropdown";
import { MessagesSidebar } from "./sidebar/MessagesSidebar";
import { CompanyDashboardNav } from "./sidebar/CompanyDashboardNav";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

interface AppSidebarProps {
  selectedUser?: any;
  onUserSelect?: (user: any) => void;
  onStartChat?: (user: any) => void;
}

export function AppSidebar({ selectedUser, onUserSelect, onStartChat }: AppSidebarProps) {
  const location = useLocation();
  const { users, currentUserId } = useCompanyUsers();
  
  console.log('🔥 AppSidebar: Rendering with users:', users?.length);
  
  // Get user IDs for unread count tracking (excluding current user)
  const userIds = users?.filter(user => user.id !== currentUserId).map(user => user.id) || [];
  console.log('🔥 AppSidebar: User IDs for unread tracking:', userIds);
  const { unreadCounts, markConversationAsRead } = useUnreadCounts(userIds);
  
  const isMessagesPage = location.pathname === '/messages' || location.pathname.includes('/messages');
  const isCompanyDashboard = location.pathname === '/' || location.pathname === '/accounting';
  const isIssuesPage = location.pathname === '/issues';

  return (
    <Sidebar className="border-r border-border">
      <SidebarBranding />
      {isCompanyDashboard ? (
        <>
          <CompanyDashboardNav />
          <SidebarSeparator className="my-2 bg-gray-200 -mx-0" />
          <MessagesSidebar 
            selectedUser={selectedUser || null}
            onUserSelect={onUserSelect}
            onStartChat={onStartChat}
            unreadCounts={unreadCounts}
            markConversationAsRead={markConversationAsRead}
          />
        </>
      ) : isMessagesPage ? (
        <MessagesSidebar 
          selectedUser={selectedUser || null}
          onUserSelect={onUserSelect}
          onStartChat={onStartChat}
          unreadCounts={unreadCounts}
          markConversationAsRead={markConversationAsRead}
        />
      ) : (
        <SidebarNavigation 
          unreadCounts={unreadCounts}
        />
      )}
      <SidebarUserDropdown />
    </Sidebar>
  );
}