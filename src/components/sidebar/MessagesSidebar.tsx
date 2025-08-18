import { useState, useEffect } from "react";
import { MessageSquare, User, AlertTriangle, Calculator } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnreadBadge } from "@/components/ui/unread-badge";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useCompanyUsers, User as CompanyUser } from "@/hooks/useCompanyUsers";
import { UnreadCounts } from "@/hooks/useUnreadCounts";
import { useIssueCounts } from "@/hooks/useIssueCounts";

interface MessagesSidebarProps {
  selectedUser: CompanyUser | null;
  onUserSelect: (user: CompanyUser) => void;
  onStartChat: (user: CompanyUser) => void;
  unreadCounts: UnreadCounts;
  markConversationAsRead: (otherUserId: string) => Promise<void>;
  showAccountingLink?: boolean;
}

export function MessagesSidebar({ 
  selectedUser, 
  onUserSelect, 
  onStartChat, 
  unreadCounts, 
  markConversationAsRead,
  showAccountingLink = false
}: MessagesSidebarProps) {
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const { data: issueCounts } = useIssueCounts();

  // Filter and sort users alphabetically by first name
  const filteredUsers = users
    .filter(user => user.id !== currentUserId) // Don't show current user
    .sort((a, b) => {
      const nameA = a.first_name || a.email;
      const nameB = b.first_name || b.email;
      return nameA.localeCompare(nameB);
    });

  // Get user IDs for unread count tracking - removed since it's now passed as props
  // const userIds = filteredUsers.map(user => user.id);
  // const { unreadCounts, markConversationAsRead } = useUnreadCounts(userIds);

  // Calculate total issue counts
  const totalNormalIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.normal,
    0
  );
  const totalHighIssues = Object.values(issueCounts || {}).reduce(
    (total, category) => total + category.high,
    0
  );

  const getInitials = (user: CompanyUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user: CompanyUser) => {
    if (user.first_name) {
      return user.first_name;
    }
    return user.email;
  };

  const handleUserClick = (user: CompanyUser) => {
    console.log('MessagesSidebar: handleUserClick called with user:', user);
    console.log('MessagesSidebar: onStartChat function is:', onStartChat);
    // Mark conversation as read when user clicks on it
    markConversationAsRead(user.id);
    // Only trigger floating chat, don't update selected user or navigate
    console.log('MessagesSidebar: About to call onStartChat');
    if (onStartChat) {
      onStartChat(user);
      console.log('MessagesSidebar: onStartChat called successfully');
    } else {
      console.error('MessagesSidebar: onStartChat function is not provided!');
    }
  };

  if (isLoading) {
    return (
      <SidebarContent className="px-3 pt-0 flex-1 overflow-hidden">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading users...</div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent className="px-3 pt-0 flex-1 overflow-hidden">
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="text-lg font-semibold mb-2 mt-4">
          Messages
        </SidebarGroupLabel>
        
        <SidebarGroupContent>
          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                 <div
                   key={user.id}
                   className={`flex items-center py-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                     selectedUser?.id === user.id ? 'bg-gray-100' : ''
                   }`}
                   onClick={() => handleUserClick(user)}
                 >
                   <div className="relative">
                     <Avatar className="h-16 w-16 flex-shrink-0">
                       <AvatarImage src={user.avatar_url || ""} />
                       <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                         {getInitials(user)}
                       </AvatarFallback>
                     </Avatar>
                     <UnreadBadge count={unreadCounts[user.id] || 0} />
                   </div>
                   
                   <div className="flex-1 min-w-0 ml-2">
                     <p className="text-base font-medium text-gray-900">
                       {getDisplayName(user)}
                     </p>
                   </div>
                 </div>
              ))
            ) : (
              <div className="text-center py-8">
                <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No users available</p>
              </div>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Software Issues Section */}
      <SidebarSeparator className="my-4 bg-gray-200 -mx-3" />
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
              >
                <a href="/issues" className="flex items-center p-3 rounded-lg w-full">
                  <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="font-medium whitespace-nowrap">Software Issues</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {totalNormalIssues > 0 && (
                      <span className="bg-gray-800 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                        {totalNormalIssues > 99 ? '99+' : totalNormalIssues}
                      </span>
                    )}
                    {totalHighIssues > 0 && (
                      <span className="bg-destructive text-destructive-foreground rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium">
                        {totalHighIssues > 99 ? '99+' : totalHighIssues}
                      </span>
                    )}
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* Accounting Link - only show on company dashboard */}
            {showAccountingLink && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                >
                  <a href="/accounting" className="flex items-center p-3 rounded-lg w-full">
                    <Calculator className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">Accounting</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}