import { useState, useEffect } from "react";
import { MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  // Filter and sort users alphabetically by first name
  const filteredUsers = users
    .filter(user => user.id !== currentUserId) // Don't show current user
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
        <SidebarGroupContent>
          {/* Users List */}
          <SidebarMenu>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <SidebarMenuItem key={user.id}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors ${
                      selectedUser?.id === user.id ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div 
                      className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer w-full"
                      onClick={() => handleUserClick(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <span className="font-medium text-sm flex-1 text-left">
                        {getDisplayName(user)}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            ) : (
              <div className="text-center py-8">
                <User className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No users available</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}