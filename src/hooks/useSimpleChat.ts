import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  email: string;
}

export interface ChatRoom {
  id: string;
  name?: string;
  is_direct_message: boolean;
  updated_at: string;
  otherUser?: User;
  lastMessage?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  message_text?: string;
  file_urls?: string[];
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
}

export const useSimpleChat = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await fetchUsers();
      }
    };
    getCurrentUser();
  }, []);

  // Fetch all users in the company
  const fetchUsers = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let allUsers: User[] = [];

      // Check if current user is an owner
      const { data: ownerProfile } = await supabase
        .from('owners')
        .select('*')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (ownerProfile) {
        // User is owner - get all employees
        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .eq('home_builder_id', currentUser.user.id)
          .eq('confirmed', true);
        
        allUsers = employees?.map(emp => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          role: emp.role,
          avatar_url: emp.avatar_url,
          email: emp.email
        })) || [];
      } else {
        // User is employee - get owner and other employees
        const { data: employee } = await supabase
          .from('employees')
          .select('home_builder_id')
          .eq('id', currentUser.user.id)
          .single();

        if (employee?.home_builder_id) {
          // Get owner
          const { data: owner } = await supabase
            .from('owners')
            .select('*')
            .eq('id', employee.home_builder_id)
            .single();

          // Get other employees
          const { data: employees } = await supabase
            .from('employees')
            .select('*')
            .eq('home_builder_id', employee.home_builder_id)
            .eq('confirmed', true)
            .neq('id', currentUser.user.id);

          allUsers = [
            ...(owner ? [{
              id: owner.id,
              first_name: owner.first_name || 'Owner',
              last_name: owner.last_name || '',
              role: 'owner',
              avatar_url: owner.avatar_url,
              email: owner.email
            }] : []),
            ...(employees?.map(emp => ({
              id: emp.id,
              first_name: emp.first_name,
              last_name: emp.last_name,
              role: emp.role,
              avatar_url: emp.avatar_url,
              email: emp.email
            })) || [])
          ];
        }
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Start chat with user
  const startChatWithUser = async (user: User) => {
    try {
      console.log('Starting chat with user:', user.id);
      
      const { data: roomId, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: user.id
      });

      if (error) throw error;

      console.log('Room created/found:', roomId);

      const newRoom: ChatRoom = {
        id: roomId,
        is_direct_message: true,
        updated_at: new Date().toISOString(),
        otherUser: user
      };

      setSelectedRoom(newRoom);
      await fetchMessages(roomId);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive"
      });
    }
  };

  // Fetch messages for room
  const fetchMessages = async (roomId: string) => {
    try {
      setIsLoadingMessages(true);
      console.log('Fetching messages for room:', roomId);
      
      const { data, error } = await supabase
        .from('employee_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      // Get sender info for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg) => {
          let senderName = 'Unknown';
          let senderAvatar = null;

          // Try owners first
          const { data: owner } = await supabase
            .from('owners')
            .select('first_name, last_name, avatar_url')
            .eq('id', msg.sender_id)
            .maybeSingle();

          if (owner) {
            senderName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
            senderAvatar = owner.avatar_url;
          } else {
            // Try employees
            const { data: employee } = await supabase
              .from('employees')
              .select('first_name, last_name, avatar_url')
              .eq('id', msg.sender_id)
              .maybeSingle();

            if (employee) {
              senderName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
              senderAvatar = employee.avatar_url;
            }
          }

          return {
            ...msg,
            sender_name: senderName,
            sender_avatar: senderAvatar
          };
        })
      );

      setMessages(messagesWithSenders);
      console.log('Messages loaded:', messagesWithSenders.length);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Send message
  const sendMessage = async (messageText: string, files: File[] = []) => {
    console.log('Sending message:', messageText);
    
    if (!messageText.trim() && files.length === 0) return;
    if (!selectedRoom) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Upload files if any
      let fileUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${Date.now()}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file);
          
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName);
          
          fileUrls.push(publicUrl);
        }
      }

      // Insert message
      const { error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageText.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null
        });

      if (error) {
        console.error('Error inserting message:', error);
        throw error;
      }

      console.log('Message sent successfully');
      
      // Refresh messages
      await fetchMessages(selectedRoom.id);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Mark room as read
  const markRoomAsRead = async (roomId: string) => {
    try {
      await supabase.rpc('mark_room_as_read', {
        room_id_param: roomId
      });
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  // Set up real-time subscription when room is selected
  useEffect(() => {
    if (!selectedRoom) return;

    console.log('Setting up real-time subscription for room:', selectedRoom.id);

    const channel = supabase
      .channel(`messages_${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          // Refresh messages when new message arrives
          fetchMessages(selectedRoom.id);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

  return {
    users,
    rooms,
    messages,
    selectedRoom,
    currentUserId,
    isLoading,
    isLoadingMessages,
    setSelectedRoom,
    startChatWithUser,
    startChatWithEmployee: startChatWithUser, // Alias for backwards compatibility
    sendMessage,
    fetchMessages,
    markRoomAsRead
  };
};