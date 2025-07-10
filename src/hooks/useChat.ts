import { useState, useEffect } from "react";
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
  reply_to_message_id: string | null;
  replied_message?: ChatMessage | null;
  sender: Employee;
}

export function useChat() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // Fetch messages for a room
  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee_chat_messages')
        .select(`
          id,
          message_text,
          file_urls,
          created_at,
          sender_id,
          reply_to_message_id
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // For each message, get the sender details from either profiles or employees table
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (message: any) => {
          // Try to find sender in owners table first (home builders)
          let { data: senderProfile } = await supabase
            .from('owners')
            .select('id, first_name, last_name, avatar_url, email')
            .eq('id', message.sender_id)
            .single();

          // If not found in users, try employees table
          if (!senderProfile) {
            const { data: employeeSender } = await supabase
              .from('employees')
              .select('id, first_name, last_name, role, avatar_url, email')
              .eq('id', message.sender_id)
              .single();
            if (employeeSender) {
              senderProfile = { ...employeeSender };
            }
          }

          return {
            ...message,
            sender: senderProfile || { id: message.sender_id, first_name: 'Unknown', last_name: 'User', role: '', avatar_url: '', email: '' }
          };
        })
      );

      // Create a map for quick lookup
      const messagesMap = new Map(messagesWithSenders.map(msg => [msg.id, msg]));
      
      // Add replied_message references
      const messagesWithReplies = messagesWithSenders.map(msg => ({
        ...msg,
        replied_message: msg.reply_to_message_id ? messagesMap.get(msg.reply_to_message_id) || null : null
      }));

      setMessages(messagesWithReplies);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Start a new chat with an employee
  const startChatWithEmployee = async (employee: Employee) => {
    try {
      console.log('Starting chat with employee:', employee);
      
      const { data, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: employee.id
      });

      console.log('get_or_create_dm_room result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Fetch the room details
      const { data: room, error: roomError } = await supabase
        .from('employee_chat_rooms')
        .select('*')
        .eq('id', data)
        .single();

      console.log('Room fetch result:', { room, roomError });

      if (roomError) {
        console.error('Room fetch error:', roomError);
        throw roomError;
      }

      const newRoom = {
        ...room,
        otherUser: employee
      };

      setSelectedRoom(newRoom);
      await fetchMessages(data);
      
      // Navigate to messages page if not already there
      if (window.location.pathname !== '/messages') {
        navigate('/messages');
      }
      
      console.log('Chat started successfully');
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
    console.log('Starting file upload for files:', files.length);
    
    // Check current user
    const { data: currentUser } = await supabase.auth.getUser();
    console.log('Current user during upload:', currentUser.user?.id);
    
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      console.log('Uploading file:', fileName);
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
      
      console.log('File uploaded successfully:', data);
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    console.log('All files uploaded, URLs:', uploadedUrls);
    return uploadedUrls;
  };

  // Send a message
  const sendMessage = async (messageText: string, files: File[] = [], replyToMessageId?: string) => {
    if (!messageText.trim() && files.length === 0) return;
    if (!selectedRoom) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let fileUrls: string[] = [];
      
      // Upload files if any are selected
      if (files.length > 0) {
        fileUrls = await uploadFiles(files);
      }

      const { error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageText.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          reply_to_message_id: replyToMessageId || null
        });

      if (error) throw error;
      
      // Refresh messages
      await fetchMessages(selectedRoom.id);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Edit a message
  const editMessage = async (messageId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from('employee_chat_messages')
        .update({ message_text: newText, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      
      // Refresh messages
      if (selectedRoom) {
        await fetchMessages(selectedRoom.id);
      }
      
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('employee_chat_messages')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      
      // Refresh messages
      if (selectedRoom) {
        await fetchMessages(selectedRoom.id);
      }
      
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
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
      fetchMessages(selectedRoom.id);
      markSelectedRoomAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  return {
    selectedRoom,
    setSelectedRoom,
    messages,
    currentUserId,
    startChatWithEmployee,
    sendMessage,
    editMessage,
    deleteMessage,
    fetchMessages,
    markSelectedRoomAsRead
  };
}

export type { Employee, ChatRoom, ChatMessage };