import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch employees for search
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
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, role, avatar_url, email')
          .eq('home_builder_id', currentUser.user.id)
          .eq('confirmed', true);

        if (empError) throw empError;
        allUsers = employees || [];

        // Also add other home builders for potential collaboration
        const { data: otherHomeBuilders, error: hbError } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, avatar_url, email')
          .neq('id', currentUser.user.id);

        if (hbError) throw hbError;
        allUsers = [...allUsers, ...(otherHomeBuilders || [])];
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
            .select('id, first_name, last_name, role, avatar_url, email')
            .eq('id', employeeData.home_builder_id)
            .single();

          if (hbError) throw hbError;
          if (homeBuilder) allUsers.push(homeBuilder);

          // Get other employees in the same company
          const { data: coworkers, error: empError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, role, avatar_url, email')
            .eq('home_builder_id', employeeData.home_builder_id)
            .neq('id', currentUser.user.id)
            .eq('confirmed', true);

          if (empError) throw empError;
          allUsers = [...allUsers, ...(coworkers || [])];
        }
      }

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
                .single();

              // If not found in users, try employees table
              if (!userProfile) {
                const { data: employeeProfile } = await supabase
                  .from('employees')
                  .select('id, first_name, last_name, role, avatar_url, email')
                  .eq('id', otherParticipant.user_id)
                  .single();
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

  // Filter employees and rooms based on search
  const filteredEmployees = employees.filter(employee => {
    const name = getDisplayName(employee);
    const role = employee.role || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredRooms = chatRooms.filter(room => {
    if (room.is_direct_message && room.otherUser) {
      const name = getDisplayName(room.otherUser);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return room.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
  });

  return (
    <SidebarContent className="px-3 py-4">
      <SidebarGroup>
        <SidebarGroupContent>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900 mb-3">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Existing Chat Rooms */}
                {filteredRooms.map((room) => (
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
                        {room.unreadCount && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {room.otherUser ? getDisplayName(room.otherUser) : room.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {new Date(room.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {room.otherUser?.role || 'Group Chat'}
                        </p>
                        {room.lastMessage && (
                          <p className="text-sm text-gray-600 truncate mt-1">{room.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Available Employees */}
                {searchQuery && (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b">
                      <h3 className="text-sm font-medium text-gray-700">Start new chat with:</h3>
                    </div>
                    {filteredEmployees
                      .filter(emp => !filteredRooms.some(room => room.otherUser?.id === emp.id))
                      .map((employee) => (
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
                            <p className="text-sm text-gray-500 truncate">{employee.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!loading && filteredRooms.length === 0 && !searchQuery && (
                  <div className="p-4 text-center text-gray-500">
                    No conversations yet. Search for employees to start chatting!
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
