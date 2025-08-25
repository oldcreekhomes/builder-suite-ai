import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useCompanyUsers, User as CompanyUser } from "@/hooks/useCompanyUsers";
import { UnreadCounts } from "@/hooks/useUnreadCounts";
interface MessagesSidebarProps {
  selectedUser: CompanyUser | null;
  onUserSelect: (user: CompanyUser) => void;
  onStartChat: (user: CompanyUser) => void;
  unreadCounts: UnreadCounts;
  markConversationAsRead: (otherUserId: string) => Promise<void>;
}
export function MessagesSidebar({
  selectedUser,
  onUserSelect,
  onStartChat,
  unreadCounts,
  markConversationAsRead
}: MessagesSidebarProps) {
  const {
    users,
    currentUserId,
    isLoading
  } = useCompanyUsers();

  // Filter and sort users alphabetically by first name
  const filteredUsers = users.filter(user => user.id !== currentUserId) // Don't show current user
  .sort((a, b) => {
    const nameA = a.first_name || a.email;
    const nameB = b.first_name || b.email;
    return nameA.localeCompare(nameB);
  });
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
    return <SidebarContent className="px-3 pt-0 flex-1 overflow-hidden">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading users...</div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>;
  }
  return <SidebarContent className="px-3 pt-0 flex-1 overflow-hidden">
      <SidebarGroup className="p-0">
        
        
        <SidebarGroupContent>
          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length > 0 ? filteredUsers.map(user => <div key={user.id} className={`flex items-center py-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${selectedUser?.id === user.id ? 'bg-gray-100' : ''}`} onClick={() => handleUserClick(user)}>
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
                 </div>) : <div className="text-center py-8">
                <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No users available</p>
              </div>}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>;
}