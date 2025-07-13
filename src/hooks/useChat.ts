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
  reply_to_message_id: string | null;
  replied_message?: ChatMessage | null;
  sender: Employee;
}

export function useChat() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);
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

  // Use ref for AbortController to avoid state updates after unmount
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Helper function to process messages with sender info
  const processMessagesWithSenders = async (data: any[]) => {
    const messagesWithSenders = [];
    
    for (const message of data) {
      try {
        // Try to find sender in owners table first (home builders)
        let { data: senderProfile } = await supabase
          .from('owners')
          .select('id, first_name, last_name, avatar_url, email, role')
          .eq('id', message.sender_id)
          .maybeSingle();

        // If not found in owners, try employees table
        if (!senderProfile) {
          const { data: employeeSender } = await supabase
            .from('employees')
            .select('id, first_name, last_name, role, avatar_url, email')
            .eq('id', message.sender_id)
            .maybeSingle();
          
          if (employeeSender) {
            senderProfile = { ...employeeSender };
          }
        }

        // Add message with sender info
        messagesWithSenders.push({
          ...message,
          sender: senderProfile || { 
            id: message.sender_id, 
            first_name: 'Unknown', 
            last_name: 'User', 
            role: 'user', 
            avatar_url: null, 
            email: '' 
          }
        });
      } catch (senderError) {
        console.error('Error processing message sender:', senderError);
        // Add message with fallback sender info
        messagesWithSenders.push({
          ...message,
          sender: { 
            id: message.sender_id, 
            first_name: 'Unknown', 
            last_name: 'User', 
            role: 'user', 
            avatar_url: null, 
            email: '' 
          }
        });
      }
    }

    // Create a map for quick lookup
    const messagesMap = new Map(messagesWithSenders.map(msg => [msg.id, msg]));
    
    // Add replied_message references
    return messagesWithSenders.map(msg => ({
      ...msg,
      replied_message: msg.reply_to_message_id ? messagesMap.get(msg.reply_to_message_id) || null : null
    }));
  };

  // Refresh messages without showing loading state (for after sending)
  const refreshMessages = async (roomId: string) => {
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      console.log('Refreshing messages for room:', roomId);
      
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
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('Messages refresh result:', { data, error, count: data?.length });
      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No messages found for room:', roomId);
        if (mountedRef.current) {
          setMessages([]);
          setHasMoreMessages(false);
          setOldestMessageDate(null);
        }
        return;
      }

      console.log('Processing', data.length, 'messages...');

      // Process messages with sender info
      const messagesWithReplies = await processMessagesWithSenders(data);

      // Check if request was cancelled
      if (newAbortController.signal.aborted) {
        console.log('Request was cancelled');
        return;
      }

      // Reverse to show oldest to newest
      const orderedMessages = messagesWithReplies.reverse();

      console.log('Setting messages, final count:', orderedMessages.length);
      setMessages(orderedMessages);
      
      // Set pagination state
      setHasMoreMessages(data.length === 20); // If we got 20 messages, there might be more
      
      // Set oldest message date for pagination
      if (data.length > 0) {
        const oldestCreatedAt = data[data.length - 1].created_at;
        setOldestMessageDate(oldestCreatedAt);
      }

      console.log('Messages state updated');
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoadingMessages(false);
      }
    }
  };

  // Fetch initial messages for a room (last 20)
  const fetchMessages = async (roomId: string) => {
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;

      if (mountedRef.current) {
        setIsLoadingMessages(true);
      }
      
      console.log('Fetching initial messages for room:', roomId);
      
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
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('Messages query result:', { data, error, count: data?.length });
      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No messages found for room:', roomId);
        if (mountedRef.current) {
          setMessages([]);
          setHasMoreMessages(false);
          setOldestMessageDate(null);
        }
        return;
      }

      console.log('Processing', data.length, 'messages...');

      // Process messages with sender info
      const messagesWithReplies = await processMessagesWithSenders(data);

      // Check if request was cancelled
      if (newAbortController.signal.aborted) {
        console.log('Request was cancelled');
        return;
      }

      // Reverse to show oldest to newest
      const orderedMessages = messagesWithReplies.reverse();

      console.log('Setting messages, final count:', orderedMessages.length);
      setMessages(orderedMessages);
      
      // Set pagination state
      setHasMoreMessages(data.length === 20); // If we got 20 messages, there might be more
      setOldestMessageDate(data.length > 0 ? data[data.length - 1].created_at : null);
      
      console.log('Messages state updated');
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.name !== 'AbortError' && mountedRef.current) {
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
      abortControllerRef.current = null;
    }
  };

  // Load more messages (for infinite scrolling)
  const loadMoreMessages = async () => {
    if (!selectedRoom || !oldestMessageDate || isLoadingMore || !hasMoreMessages) {
      return;
    }

    try {
      setIsLoadingMore(true);
      console.log('Loading more messages before:', oldestMessageDate);
      
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
        .eq('room_id', selectedRoom.id)
        .eq('is_deleted', false)
        .lt('created_at', oldestMessageDate)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No more messages found');
        setHasMoreMessages(false);
        return;
      }

      console.log('Processing', data.length, 'additional messages...');

      // Process messages with sender info
      const messagesWithReplies = await processMessagesWithSenders(data);

      // Reverse to show oldest to newest and prepend to existing messages
      const orderedNewMessages = messagesWithReplies.reverse();
      
      setMessages(prev => [...orderedNewMessages, ...prev]);
      
      // Update pagination state
      setHasMoreMessages(data.length === 20);
      setOldestMessageDate(data.length > 0 ? data[data.length - 1].created_at : oldestMessageDate);
      
      console.log('Loaded', orderedNewMessages.length, 'more messages');
    } catch (error) {
      console.error('Error loading more messages:', error);
      toast({
        title: "Error",
        description: "Failed to load more messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
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
      
      // Navigate to messages page if not already there, passing the room state
      if (window.location.pathname !== '/messages') {
        navigate('/messages', { 
          state: { selectedRoom: newRoom } 
        });
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
      // Sanitize filename by removing spaces and special characters
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_${sanitizedName}`;
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

      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        message_text: messageText.trim() || null,
        file_urls: [],
        reply_to_message_id: replyToMessageId || null,
        created_at: new Date().toISOString(),
        replied_message: null,
        sender: {
          id: currentUser.user.id,
          first_name: 'You',
          last_name: '',
          email: currentUser.user.email || '',
          role: 'employee',
          avatar_url: null
        }
      };

      // Immediately add to messages for instant UI feedback
      setMessages(prev => [...prev, optimisticMessage]);

      let fileUrls: string[] = [];
      
      // Upload files if any are selected
      if (files.length > 0) {
        fileUrls = await uploadFiles(files);
        // Update the optimistic message with file URLs
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...msg, file_urls: fileUrls }
              : msg
          )
        );
      }

      // Send actual message to database
      const { data, error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageText.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          reply_to_message_id: replyToMessageId || null
        })
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic message with real message
      if (data) {
        // Refresh the messages without showing loading state
        await refreshMessages(selectedRoom.id);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      
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
      // Clear messages immediately when switching rooms
      setMessages([]);
      fetchMessages(selectedRoom.id);
      markSelectedRoomAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  // Set up real-time subscription for the current room
  useEffect(() => {
    if (!selectedRoom || !currentUserId) return;

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
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only refresh for messages from other users (current user messages are handled by optimistic updates)
          if (newMessage.sender_id !== currentUserId) {
            await refreshMessages(selectedRoom.id);
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
    isLoadingMore,
    hasMoreMessages,
    startChatWithEmployee,
    sendMessage,
    editMessage,
    deleteMessage,
    fetchMessages,
    loadMoreMessages,
    markSelectedRoomAsRead
  };
}

export type { Employee, ChatRoom, ChatMessage };