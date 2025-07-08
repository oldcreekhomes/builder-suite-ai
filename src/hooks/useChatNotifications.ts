import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnreadCounts {
  [roomId: string]: number;
}

interface ChatNotification {
  roomId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export function useChatNotifications() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

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

  // Load initial unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Get all rooms user participates in
      const { data: participantRooms } = await supabase
        .from('employee_chat_participants')
        .select('room_id')
        .eq('user_id', currentUserId);

      if (!participantRooms) return;

      const counts: UnreadCounts = {};
      let total = 0;

      // Get unread count for each room
      for (const { room_id } of participantRooms) {
        const { data: countResult } = await supabase
          .rpc('get_unread_message_count', {
            room_id_param: room_id,
            user_id_param: currentUserId
          });

        const count = countResult || 0;
        counts[room_id] = count;
        total += count;
      }

      setUnreadCounts(counts);
      setTotalUnread(total);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [currentUserId]);

  // Mark room as read
  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!currentUserId) return;

    try {
      await supabase.rpc('mark_room_as_read', {
        room_id_param: roomId
      });

      // Update local state
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        const oldCount = newCounts[roomId] || 0;
        newCounts[roomId] = 0;
        setTotalUnread(current => Math.max(0, current - oldCount));
        return newCounts;
      });
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  }, [currentUserId]);

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUserId) return;

    loadUnreadCounts();

    // Listen for new messages
    const messageChannel = supabase
      .channel('chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only process if this message is not from current user
          if (newMessage.sender_id === currentUserId) return;

          // Check if current user is participant in this room
          const { data: isParticipant } = await supabase
            .rpc('is_room_participant', {
              _room_id: newMessage.room_id,
              _user_id: currentUserId
            });

          if (!isParticipant) return;

          // Update unread count for this room
          setUnreadCounts(prev => ({
            ...prev,
            [newMessage.room_id]: (prev[newMessage.room_id] || 0) + 1
          }));

          setTotalUnread(current => current + 1);

          // Get sender info for notification
          try {
            let senderName = 'Someone';
            
            // Try owners table first
            const { data: userSender } = await supabase
              .from('owners')
              .select('first_name, last_name')
              .eq('id', newMessage.sender_id)
              .single();

            if (userSender) {
              senderName = `${userSender.first_name || ''} ${userSender.last_name || ''}`.trim();
            } else {
              // Try employees table
              const { data: employeeSender } = await supabase
                .from('employees')
                .select('first_name, last_name')
                .eq('id', newMessage.sender_id)
                .single();

              if (employeeSender) {
                senderName = `${employeeSender.first_name || ''} ${employeeSender.last_name || ''}`.trim();
              }
            }

            // Show toast notification
            toast({
              title: `New message from ${senderName}`,
              description: newMessage.message_text || 'File attachment',
            });

          } catch (error) {
            console.error('Error getting sender info:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [currentUserId, loadUnreadCounts, toast]);

  return {
    unreadCounts,
    totalUnread,
    markRoomAsRead,
    loadUnreadCounts
  };
}