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

  const shouldShowNotification = useCallback(() => {
    return true; // Always show notifications since do not disturb is removed
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!preferences.sound_notifications_enabled) return;
    
    try {
      // Generate data URL for different notification sounds
      let frequency1, frequency2, duration;
      
      switch (preferences.notification_sound) {
        case 'bell':
          frequency1 = 800;
          frequency2 = 600;
          duration = 0.3;
          break;
        case 'notification':
          frequency1 = 1000;
          frequency2 = 800;
          duration = 0.4;
          break;
        case 'subtle':
          frequency1 = 400;
          frequency2 = 350;
          duration = 0.2;
          break;
        default: // chime
          frequency1 = 523; // C5
          frequency2 = 659; // E5
          duration = 0.3;
      }
      
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency1, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(frequency2, audioContext.currentTime + duration / 2);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      // Cleanup after playing
      oscillator.onended = () => {
        audioContext.close();
      };
      
    } catch (error) {
      console.log('Could not play notification sound:', error);
      
      // Fallback: try to play a simple system beep
      try {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        
        oscillator.connect(gain);
        gain.connect(context.destination);
        
        oscillator.frequency.value = 800;
        gain.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
        
        setTimeout(() => context.close(), 300);
      } catch (fallbackError) {
        console.log('Fallback notification sound also failed:', fallbackError);
      }
    }
  }, [preferences.sound_notifications_enabled, preferences.notification_sound]);

  const showNotifications = useCallback((senderName: string, messageText: string | null, isDirectMessage: boolean) => {
    const messagePreview = messageText || 'Sent an attachment';
    const title = `New ${isDirectMessage ? 'direct message' : 'group message'} from ${senderName}`;

    // Show toast notification with Sonner for better visibility
    if (preferences.toast_notifications_enabled) {
      sonnerToast(title, {
        description: messagePreview,
        duration: 5000, // Fixed 5 seconds
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
  }, [preferences.toast_notifications_enabled, preferences.browser_notifications_enabled, playNotificationSound]);

  return {
    unreadCounts,
    totalUnread,
    markRoomAsRead,
    loadUnreadCounts
  };
}