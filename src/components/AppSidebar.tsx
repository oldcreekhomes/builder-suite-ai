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
import { CompanyDashboardNav } from "./sidebar/CompanyDashboardNav";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";

interface AppSidebarProps {
  selectedUser?: any;
  onUserSelect?: (user: any) => void;
  onStartChat?: (user: any) => void;
  unreadCounts?: Record<string, number>;
  connectionState?: string;
  markConversationAsRead?: ((userId: string) => Promise<void>) | null;
}

export function AppSidebar({ 
  selectedUser, 
  onUserSelect, 
  onStartChat,
  unreadCounts = {},
  connectionState = 'disconnected',
  markConversationAsRead
}: AppSidebarProps) {
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

  // Calculate total unread count for Messages tab badge
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const isCompanyDashboardPage = location.pathname === '/';

  // For company dashboard page, show the specialized company dashboard sidebar with tabs
  if (isCompanyDashboardPage) {
    return (
      <Sidebar className="border-r border-border overflow-hidden">
        <SidebarBranding />
        
        {/* Tab Navigation */}
        <div className="px-3">
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
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'menus' ? (
            <CompanyDashboardNav />
          ) : (
            <MessagesSidebar
              selectedUser={selectedUser || null}
              onUserSelect={onUserSelect}
              onStartChat={onStartChat}
              unreadCounts={unreadCounts}
              markConversationAsRead={markConversationAsRead || (async () => {})}
            />
          )}
        </div>
        
        <SidebarUserDropdown />
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-border overflow-hidden">
      <SidebarBranding />
      
      {/* Tab Navigation */}
      <div className="px-3">
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
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'menus' ? (
          <SidebarNavigation unreadCounts={unreadCounts} />
        ) : (
          <MessagesSidebar
            selectedUser={selectedUser || null}
            onUserSelect={onUserSelect}
            onStartChat={onStartChat}
            unreadCounts={unreadCounts}
            markConversationAsRead={markConversationAsRead || (async () => {})}
          />
        )}
      </div>

      <SidebarUserDropdown />
    </Sidebar>
  );
}