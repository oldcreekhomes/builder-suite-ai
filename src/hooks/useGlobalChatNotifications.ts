import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import { toast } from 'sonner';

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export const useGlobalChatNotifications = (activeConversationUserId: string | null) => {
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);
  const { preferences } = useNotificationPreferences();

  // Sound generation function (same as in NotificationPreferences)
  const playNotificationSound = () => {
    if (!preferences?.sound_notifications_enabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => {
    const setupGlobalNotifications = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      currentUserRef.current = user.id;

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Subscribe to all chat messages for notifications
      const channelName = `global_chat_notifications_${Date.now()}`;
      
      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_chat_messages'
          },
          async (payload) => {
            const messageData = payload.new;
            
            if (!messageData || !currentUserRef.current) return;

            const senderId = messageData.sender_id;
            const recipientId = messageData.recipient_id;

            // Only notify if this message is FOR the current user and NOT from them
            const isIncomingMessage = recipientId === currentUserRef.current && senderId !== currentUserRef.current;
            
            // Skip notification if user is actively viewing this conversation
            const isActiveConversation = activeConversationUserId === senderId;

            if (isIncomingMessage && !isActiveConversation) {
              // Get sender information
              const { data: senderData } = await supabase
                .from('users')
                .select('first_name, last_name, avatar_url')
                .eq('id', senderId)
                .single();

              if (senderData) {
                const senderName = `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || 'Someone';
                const messagePreview = messageData.message_text 
                  ? (messageData.message_text.length > 50 
                      ? `${messageData.message_text.substring(0, 50)}...` 
                      : messageData.message_text)
                  : messageData.file_urls?.length 
                    ? '📎 Sent an attachment' 
                    : 'New message';

                // Show toast notification if enabled
                if (preferences?.toast_notifications_enabled) {
                  toast(`${senderName}`, {
                    description: messagePreview,
                    action: {
                      label: 'View',
                      onClick: () => {
                        // This could navigate to the chat, but for now we'll just close the toast
                        console.log('Navigate to chat with:', senderId);
                      }
                    }
                  });
                }

                // Play sound notification if enabled
                if (preferences?.sound_notifications_enabled) {
                  playNotificationSound();
                }
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Global chat notifications status:', status);
        });
    };

    setupGlobalNotifications();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeConversationUserId, preferences?.toast_notifications_enabled, preferences?.sound_notifications_enabled]);
};