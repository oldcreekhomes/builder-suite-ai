import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu, MessageSquare } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { SidebarBranding } from "./sidebar/SidebarBranding";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarUserDropdown } from "./sidebar/SidebarUserDropdown";
import { MessagesSidebar } from "./sidebar/MessagesSidebar";
import { AccountingSidebar } from "./sidebar/AccountingSidebar";
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
  
  // State for active tab with localStorage persistence
  const [activeTab, setActiveTab] = useState<'menus' | 'messages'>(() => {
    const saved = localStorage.getItem('sidebar-active-tab');
    return (saved as 'menus' | 'messages') || 'menus';
  });

  // Save tab state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-active-tab', activeTab);
  }, [activeTab]);

  // Get user IDs for unread count tracking (excluding current user)
  const userIds = users?.filter(user => user.id !== currentUserId).map(user => user.id) || [];
  const { unreadCounts, markConversationAsRead } = useUnreadCounts(userIds);

  // Calculate total unread count for Messages tab badge
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const isAccountingPage = location.pathname === '/accounting' || location.pathname.includes('/accounting');

  // For accounting pages, show the specialized accounting sidebar
  if (isAccountingPage) {
    return (
      <Sidebar className="border-r border-border">
        <SidebarBranding />
        <AccountingSidebar />
        <SidebarUserDropdown />
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-border">
      <SidebarBranding />
      
      {/* Tab Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <div className="flex border-b border-border">
            <Button
              variant={activeTab === 'menus' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('menus')}
              className="flex-1 rounded-none border-0 justify-center"
            >
              <Menu className="h-4 w-4 mr-2" />
              Menus
            </Button>
            <Button
              variant={activeTab === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('messages')}
              className="flex-1 rounded-none border-0 justify-center relative"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {totalUnreadCount > 0 && (
                <UnreadBadge count={totalUnreadCount} className="ml-1" />
              )}
            </Button>
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Tab Content */}
      {activeTab === 'menus' ? (
        <SidebarNavigation unreadCounts={unreadCounts} />
      ) : (
        <MessagesSidebar
          selectedUser={selectedUser || null}
          onUserSelect={onUserSelect}
          onStartChat={onStartChat}
          unreadCounts={unreadCounts}
          markConversationAsRead={markConversationAsRead}
        />
      )}

      <SidebarUserDropdown />
    </Sidebar>
  );
}