import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useNotificationPreferences } from './useNotificationPreferences';

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
  const { preferences } = useNotificationPreferences();

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

          // Check if user wants notifications and respects Do Not Disturb
          if (!shouldShowNotification()) return;

          // Get room info to determine message type
          const { data: roomData } = await supabase
            .from('employee_chat_rooms')
            .select('is_direct_message')
            .eq('id', newMessage.room_id)
            .single();
            
          const isDirectMessage = roomData?.is_direct_message || false;

          // Check message type preferences
          if (isDirectMessage && !preferences.direct_message_notifications) return;
          if (!isDirectMessage && !preferences.group_message_notifications) return;

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

            // Show notifications based on preferences
            showNotifications(senderName, newMessage.message_text, isDirectMessage);

          } catch (error) {
            console.error('Error getting sender info:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [currentUserId, loadUnreadCounts, toast, preferences]);

  const isInDoNotDisturbTime = useCallback(() => {
    if (!preferences.do_not_disturb_start || !preferences.do_not_disturb_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = preferences.do_not_disturb_start.split(':').map(Number);
    const [endHour, endMinute] = preferences.do_not_disturb_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [preferences.do_not_disturb_start, preferences.do_not_disturb_end]);

  const shouldShowNotification = useCallback(() => {
    return !isInDoNotDisturbTime();
  }, [isInDoNotDisturbTime]);

  const playNotificationSound = useCallback(() => {
    if (!preferences.sound_notifications_enabled) return;
    
    try {
      // Create a simple audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different sounds based on preference
      switch (preferences.notification_sound) {
        case 'bell':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          break;
        case 'notification':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.15);
          break;
        case 'subtle':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          break;
        default: // chime
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, [preferences.sound_notifications_enabled, preferences.notification_sound]);

  const showNotifications = useCallback((senderName: string, messageText: string | null, isDirectMessage: boolean) => {
    const messagePreview = messageText || 'Sent an attachment';
    const title = `New ${isDirectMessage ? 'direct message' : 'group message'} from ${senderName}`;

    // Show toast notification with Sonner for better visibility
    if (preferences.toast_notifications_enabled) {
      sonnerToast(title, {
        description: messagePreview,
        duration: preferences.toast_duration * 1000,
        action: {
          label: "View",
          onClick: () => {
            // Navigate to messages - you might want to add navigation logic here
            console.log('Navigate to messages');
          },
        },
      });
    }

    // Show browser notification
    if (preferences.browser_notifications_enabled && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: messagePreview,
        icon: "/favicon.ico",
      });
    }

    // Play sound notification
    playNotificationSound();
  }, [preferences.toast_notifications_enabled, preferences.browser_notifications_enabled, preferences.toast_duration, playNotificationSound]);

  return {
    unreadCounts,
    totalUnread,
    markRoomAsRead,
    loadUnreadCounts
  };
}