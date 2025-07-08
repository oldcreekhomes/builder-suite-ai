import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useChatNotifications } from "@/hooks/useChatNotifications";

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { unreadCounts } = useChatNotifications();

  // Fetch employees for display
  const fetchEmployees = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allUsers: Employee[] = [];

      // First check if current user is a home builder
      const { data: homeBuilderData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (homeBuilderData) {
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
        const { data: otherHomeBuilders, error: hbError } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url, email')
          .neq('id', currentUser.user.id);

        if (hbError) throw hbError;
        if (otherHomeBuilders) {
          // Convert home builders to Employee interface format
          const formattedHomeBuilders = otherHomeBuilders.map(hb => ({
            ...hb,
            role: 'Home Builder'
          }));
          allUsers = [...allUsers, ...formattedHomeBuilders];
        }
      } else {
        // User is an employee - get their home builder and other employees in the company
        const { data: employeeData } = await supabase
          .from('employees')
          .select('home_builder_id')
          .eq('id', currentUser.user.id)
          .maybeSingle();

        if (employeeData?.home_builder_id) {
          // Get the home builder
          const { data: homeBuilder, error: hbError } = await supabase
            .from('users')
            .select('id, first_name, last_name, avatar_url, email')
            .eq('id', employeeData.home_builder_id)
            .maybeSingle();

          if (hbError && hbError.code !== 'PGRST116') throw hbError;
          if (homeBuilder) {
            allUsers.push({
              ...homeBuilder,
              role: 'Home Builder'
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
      setEmployees(allUsers);
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
              .single();

            if (otherParticipant) {
              // Try to find the user in users table first (home builders)
              let { data: userProfile } = await supabase
                .from('users')
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

      setChatRooms(roomsWithDetails);
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

  // Combine chat rooms with employees for display
  const getCombinedUserList = () => {
    const usersWithChats: Employee[] = [];
    const usersWithoutChats: Employee[] = [];

    employees.forEach(employee => {
      const hasExistingChat = chatRooms.some(room => room.otherUser?.id === employee.id);
      if (hasExistingChat) {
        usersWithChats.push(employee);
      } else {
        usersWithoutChats.push(employee);
      }
    });

    return { usersWithChats, usersWithoutChats };
  };

  const { usersWithChats, usersWithoutChats } = getCombinedUserList();

  return (
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupContent>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Company Members - Now at the top */}
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <h3 className="text-sm font-medium text-gray-700">Company Members</h3>
                </div>

                {/* Users with existing conversations first */}
                {chatRooms
                  .filter(room => room.otherUser && room.otherUser.first_name && room.otherUser.last_name) // Filter out GC entries
                  .map((room) => (
                  <div
                    key={room.id}
                    onClick={() => onRoomSelect(room)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                      selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={room.otherUser?.avatar_url || ""} />
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {room.otherUser 
                              ? getInitials(room.otherUser.first_name, room.otherUser.last_name)
                              : 'GC'
                            }
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
                          {room.otherUser ? getDisplayName(room.otherUser) : room.name}
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
                ))}

                {/* Users without conversations */}
                {employees.map((employee) => {
                  // Skip if user already has a recent conversation
                  const hasRecentChat = chatRooms.some(room => room.otherUser?.id === employee.id);
                  if (hasRecentChat) return null;

                  return (
                    <div
                      key={employee.id}
                      onClick={() => onStartChat(employee)}
                      className="p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
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