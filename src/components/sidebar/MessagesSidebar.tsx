import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role?: string | null;
  avatar_url: string | null;
  email: string;
}

interface ChatRoom {
  id: string;
  name: string | null;
  is_direct_message: boolean;
  updated_at: string;
  otherUser?: Employee;
  lastMessage?: string;
  unreadCount?: number;
}

interface MessagesSidebarProps {
  selectedRoom: ChatRoom | null;
  onRoomSelect: (room: ChatRoom) => void;
  onStartChat: (employee: Employee) => void;
}

export function MessagesSidebar({ selectedRoom, onRoomSelect, onStartChat }: MessagesSidebarProps) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Note: Global chat notifications are now handled by GlobalNotificationsProvider
  const unreadCounts: { [roomId: string]: number } = {}; // Placeholder for now

  // Combine all users and sort them alphabetically by first name
  const allSortedUsers = useMemo(() => {
    const allUsers: Array<{
      type: 'chat' | 'employee';
      user: Employee;
      room: ChatRoom | null;
    }> = [];
    
    // Add users from existing chat rooms
    chatRooms.forEach(room => {
      if (room.otherUser && room.otherUser.first_name && room.otherUser.last_name) {
        allUsers.push({
          type: 'chat' as const,
          user: room.otherUser,
          room: room
        });
      }
    });
    
    // Add employees without existing chats
    employees.forEach(employee => {
      const hasRecentChat = chatRooms.some(room => room.otherUser?.id === employee.id);
      if (!hasRecentChat) {
        allUsers.push({
          type: 'employee' as const,
          user: employee,
          room: null
        });
      }
    });
    
    // Sort all users alphabetically by first name
    return allUsers.sort((a, b) => {
      const nameA = (a.user.first_name || '').toLowerCase();
      const nameB = (b.user.first_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [chatRooms, employees]);

  // Fetch employees for display
  const fetchEmployees = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allUsers: Employee[] = [];

      // First check if current user is a home builder (owner)
      const { data: ownerData } = await supabase
        .from('owners')
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (ownerData) {
        // User is a home builder - get their employees AND other home builders
        
        // Get employees of this home builder
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, role, avatar_url, email')
          .eq('home_builder_id', currentUser.user.id)
          .eq('confirmed', true);

        if (empError) throw empError;
        if (employees) allUsers = [...allUsers, ...employees];

        // Get other home builders for collaboration
        const { data: otherOwners, error: hbError } = await supabase
          .from('owners')
          .select('id, first_name, last_name, avatar_url, email')
          .neq('id', currentUser.user.id);

        if (hbError) throw hbError;
        if (otherOwners) {
          // Convert owners to Employee interface format
          const formattedOwners = otherOwners.map(hb => ({
            ...hb,
            role: 'Owner'
          }));
          allUsers = [...allUsers, ...formattedOwners];
        }
      } else {
        // User is an employee - get their home builder and other employees in the company
        const { data: employeeData } = await supabase
          .from('employees')
          .select('home_builder_id')
          .eq('id', currentUser.user.id)
          .maybeSingle();

        if (employeeData?.home_builder_id) {
          // Get the owner
          const { data: owner, error: hbError } = await supabase
            .from('owners')
            .select('id, first_name, last_name, avatar_url, email')
            .eq('id', employeeData.home_builder_id)
            .maybeSingle();

          if (hbError && hbError.code !== 'PGRST116') throw hbError;
          if (owner) {
            allUsers.push({
              ...owner,
              role: 'Owner'
            });
          }

          // Get all employees in the same company (excluding current user)
          console.log('Fetching employees for home_builder_id:', employeeData.home_builder_id);
          const { data: coworkers, error: empError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, role, avatar_url, email')
            .eq('home_builder_id', employeeData.home_builder_id)
            .neq('id', currentUser.user.id)
            .eq('confirmed', true);

          console.log('Employees query result:', { coworkers, empError });
          if (empError) throw empError;
          if (coworkers) allUsers = [...allUsers, ...coworkers];
        }
      }

      console.log('Found users for chat:', allUsers);
      // Sort employees by first name before setting state
      const sortedEmployees = allUsers.sort((a, b) => {
        const nameA = (a.first_name || '').toLowerCase();
        const nameB = (b.first_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setEmployees(sortedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    }
  };

  // Fetch existing chat rooms
  const fetchChatRooms = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: participants, error } = await supabase
        .from('employee_chat_participants')
        .select(`
          room_id,
          employee_chat_rooms (
            id,
            name,
            is_direct_message,
            updated_at
          )
        `)
        .eq('user_id', currentUser.user.id);

      if (error) throw error;

      const rooms = participants?.map(p => p.employee_chat_rooms).filter(Boolean) || [];
      
      // For each room, get the other participant if it's a DM
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room: any) => {
          if (room.is_direct_message) {
            // Get the other participant ID
            const { data: otherParticipant } = await supabase
              .from('employee_chat_participants')
              .select('user_id')
              .eq('room_id', room.id)
              .neq('user_id', currentUser.user.id)
              .maybeSingle();

            if (otherParticipant) {
              // Try to find the user in owners table first (owners)
              let { data: userProfile } = await supabase
                .from('owners')
                .select('id, first_name, last_name, avatar_url, email')
                .eq('id', otherParticipant.user_id)
                .maybeSingle();

              // If not found in users, try employees table
              if (!userProfile) {
                const { data: employeeProfile } = await supabase
                  .from('employees')
                  .select('id, first_name, last_name, role, avatar_url, email')
                  .eq('id', otherParticipant.user_id)
                  .maybeSingle();
                if (employeeProfile) {
                  userProfile = { ...employeeProfile };
                }
              }

              return {
                ...room,
                otherUser: userProfile || null
              };
            }
          }
          return room;
        })
      );

      // Sort rooms by other user's first name before setting state
      const sortedRooms = roomsWithDetails.sort((a, b) => {
        const nameA = (a.otherUser?.first_name || '').toLowerCase();
        const nameB = (b.otherUser?.first_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setChatRooms(sortedRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchChatRooms()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (employee: Employee) => {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  };


  return (
    <SidebarContent className="px-3 py-2">
      <SidebarGroup>
        <SidebarGroupContent>
          {/* Messages title moved higher */}
          <div className="px-2 py-1 mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              <>

                {/* All users sorted alphabetically */}
                {allSortedUsers.map((userItem) => {
                  if (userItem.type === 'chat' && userItem.room) {
                    const room = userItem.room;
                    return (
                      <div
                        key={room.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onRoomSelect(room);
                          // Navigate to messages if not already there
                          if (window.location.pathname !== '/messages') {
                            navigate('/messages', {
                              state: { selectedRoom: room }
                            });
                          }
                        }}
                        className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                          selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={userItem.user.avatar_url || ""} />
                              <AvatarFallback className="bg-gray-200 text-gray-600">
                                {getInitials(userItem.user.first_name, userItem.user.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            {unreadCounts[room.id] > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                              >
                                {unreadCounts[room.id]}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {getDisplayName(userItem.user)}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {new Date(room.updated_at).toLocaleDateString()}
                            </span>
                            {room.lastMessage && (
                              <p className="text-sm text-gray-600 truncate mt-1">{room.lastMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Employee without existing chat
                    const employee = userItem.user;
                    return (
                      <div
                        key={employee.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onStartChat(employee);
                        }}
                        className="p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={employee.avatar_url || ""} />
                            <AvatarFallback className="bg-gray-200 text-gray-600">
                              {getInitials(employee.first_name, employee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {getDisplayName(employee)}
                            </h3>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}

                {/* Empty State */}
                {!loading && employees.length === 0 && chatRooms.filter(room => room.otherUser && room.otherUser.first_name).length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    <p className="mb-2">No company members found.</p>
                    <p className="text-sm">Add employees to your company to start chatting!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}