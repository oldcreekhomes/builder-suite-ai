import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

interface ChatMessage {
  id: string;
  message_text: string | null;
  file_urls: string[] | null;
  created_at: string;
  sender: Employee;
}

export function useSimpleChat() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Simple function to get messages with sender info (using database function)
  const fetchMessages = async (roomId: string) => {
    if (!mountedRef.current) return;
    
    try {
      setIsLoadingMessages(true);
      console.log('Fetching messages for room:', roomId);
      
      // Get messages with a simple query - last 50 messages
      const { data: messagesData, error } = await supabase
        .from('employee_chat_messages')
        .select(`
          id,
          message_text,
          file_urls,
          created_at,
          sender_id
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      // Fetch all senders in parallel (both owners and employees)
      const [ownersData, employeesData] = await Promise.all([
        supabase
          .from('owners')
          .select('id, first_name, last_name, avatar_url, email, role')
          .in('id', senderIds),
        supabase
          .from('employees')
          .select('id, first_name, last_name, role, avatar_url, email')
          .in('id', senderIds)
      ]);

      // Create sender lookup map
      const sendersMap = new Map();
      ownersData.data?.forEach(sender => sendersMap.set(sender.id, sender));
      employeesData.data?.forEach(sender => sendersMap.set(sender.id, sender));

      // Add sender info to messages
      const messagesWithSenders = messagesData.map(message => ({
        ...message,
        sender: sendersMap.get(message.sender_id) || {
          id: message.sender_id,
          first_name: 'Unknown',
          last_name: 'User',
          role: 'user',
          avatar_url: null,
          email: ''
        }
      }));

      if (mountedRef.current) {
        setMessages(messagesWithSenders);
      }
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingMessages(false);
      }
    }
  };

  // Start a new chat with an employee
  const startChatWithEmployee = async (employee: Employee) => {
    try {
      console.log('Starting chat with employee:', employee);
      
      const { data, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: employee.id
      });

      if (error) throw error;

      // Fetch the room details
      const { data: room, error: roomError } = await supabase
        .from('employee_chat_rooms')
        .select('*')
        .eq('id', data)
        .single();

      if (roomError) throw roomError;

      const newRoom = {
        ...room,
        otherUser: employee
      };

      setSelectedRoom(newRoom);
      await fetchMessages(data);
      
      // Navigate to messages page if not already there
      if (window.location.pathname !== '/messages') {
        navigate('/messages', { 
          state: { selectedRoom: newRoom } 
        });
      }
      
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_${sanitizedName}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  // Send a message (simplified - no optimistic updates)
  const sendMessage = async (messageText: string, files: File[] = []) => {
    console.log('sendMessage called with:', { messageText, filesCount: files.length, selectedRoom: selectedRoom?.id });
    
    if (!messageText.trim() && files.length === 0) {
      console.log('Message empty, returning early');
      return;
    }
    if (!selectedRoom) {
      console.log('No selected room, returning early');
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      console.log('Current user:', currentUser.user?.id);
      if (!currentUser.user) {
        console.log('No current user, returning early');
        return;
      }

      let fileUrls: string[] = [];
      
      // Upload files if any are selected
      if (files.length > 0) {
        console.log('Uploading files...');
        fileUrls = await uploadFiles(files);
        console.log('Files uploaded:', fileUrls);
      }

      console.log('Inserting message into database...');
      // Send message to database
      const { data, error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageText.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null
        })
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
      
      console.log('Message inserted successfully:', data);
      
      // Messages will be updated via real-time subscription
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mark room as read when selected
  const markSelectedRoomAsRead = async (roomId: string) => {
    try {
      await supabase.rpc('mark_room_as_read', {
        room_id_param: roomId
      });
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  // Fetch messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      setMessages([]); // Clear messages immediately
      fetchMessages(selectedRoom.id);
      markSelectedRoomAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  // Set up real-time subscription for the current room
  useEffect(() => {
    if (!selectedRoom || !currentUserId) return;

    const channel = supabase
      .channel(`simple_messages_${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          console.log('New message received:', newMessage);
          
          // Always refresh messages when a new message arrives
          await fetchMessages(selectedRoom.id);
          
          // Show notifications for messages from other users
          if (newMessage.sender_id !== currentUserId) {
            // Get sender info for notification
            let senderName = 'Someone';
            try {
              let { data: sender } = await supabase
                .from('owners')
                .select('first_name, last_name')
                .eq('id', newMessage.sender_id)
                .maybeSingle();
              
              if (!sender) {
                const { data: empSender } = await supabase
                  .from('employees')
                  .select('first_name, last_name')
                  .eq('id', newMessage.sender_id)
                  .maybeSingle();
                sender = empSender;
              }
              
              if (sender?.first_name) {
                senderName = `${sender.first_name} ${sender.last_name || ''}`.trim();
              }
            } catch (error) {
              console.error('Error getting sender info for notification:', error);
            }
            
            // Show toast notification
            toast({
              title: `New message from ${senderName}`,
              description: newMessage.message_text || 'Sent an attachment',
              duration: 4000,
            });
            
            // Show browser notification if available
            if (window.Notification && window.Notification.permission === 'granted') {
              new window.Notification(`New message from ${senderName}`, {
                body: newMessage.message_text || 'Sent an attachment',
                icon: '/favicon.ico'
              });
            }
            
            // Play a simple sound
            try {
              const audioContext = new AudioContext();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
              
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.2);
              
              setTimeout(() => audioContext.close(), 300);
            } catch (error) {
              console.log('Could not play notification sound:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, currentUserId]);

  return {
    selectedRoom,
    setSelectedRoom,
    messages,
    currentUserId,
    isLoadingMessages,
    startChatWithEmployee,
    sendMessage,
    fetchMessages,
    markSelectedRoomAsRead
  };
}

export type { Employee, ChatRoom, ChatMessage };