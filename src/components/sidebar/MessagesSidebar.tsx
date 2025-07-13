import { useState, useEffect } from "react";
import { MessageSquare, Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCompanyUsers, User as CompanyUser } from "@/hooks/useCompanyUsers";

interface MessagesSidebarProps {
  selectedUser: CompanyUser | null;
  onUserSelect: (user: CompanyUser) => void;
  onStartChat: (user: CompanyUser) => void;
}

export function MessagesSidebar({ selectedUser, onUserSelect, onStartChat }: MessagesSidebarProps) {
  const { users, currentUserId, isLoading } = useCompanyUsers();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort users alphabetically by first name
  const filteredUsers = users
    .filter(user => user.id !== currentUserId) // Don't show current user
    .filter(user => {
      if (!searchQuery) return true;
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = user.email.toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    })
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
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const handleUserClick = (user: CompanyUser) => {
    onUserSelect(user);
    onStartChat(user);
  };

  if (isLoading) {
    return (
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </SidebarGroupLabel>
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
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
        </SidebarGroupLabel>
        
        <SidebarGroupContent>
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users List */}
          <SidebarMenu>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <SidebarMenuItem key={user.id}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full p-3 hover:bg-gray-100 ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div 
                      className="flex items-center space-x-3 cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getDisplayName(user)}
                          </p>
                          {/* TODO: Add unread count badge */}
                          {/* <Badge variant="secondary" className="ml-2">
                            3
                          </Badge> */}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {user.role || 'User'}
                        </p>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            ) : (
              <div className="text-center py-8">
                <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No users found' : 'No users available'}
                </p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}