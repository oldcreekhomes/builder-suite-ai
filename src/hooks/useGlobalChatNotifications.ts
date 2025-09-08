import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import { toast } from 'sonner';
import { User } from './useCompanyUsers';
import { audioManager } from '@/utils/audioManager';

export const useGlobalChatNotifications = (
  activeConversationUserId: string | null,
  onNewMessage?: (user: User) => void
) => {
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);
  const activeConversationRef = useRef<string | null>(activeConversationUserId);
  const onNewMessageRef = useRef(onNewMessage);
  const { preferences } = useNotificationPreferences();

  // Update refs when values change
  activeConversationRef.current = activeConversationUserId;
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    let isCleanedUp = false;

    const setupGlobalNotifications = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || isCleanedUp) return;

        currentUserRef.current = user.id;
        console.log('📡 Setting up global chat notifications for user:', user.id);

        // Clean up existing channel
        if (channelRef.current) {
          console.log('📡 Cleaning up existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Create stable channel name without timestamp to prevent multiple subscriptions
        const channelName = `global_chat_notifications_${user.id}`;
        
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
              try {
                const messageData = payload.new;
                
                if (!messageData || !currentUserRef.current || isCleanedUp) return;

                const senderId = messageData.sender_id;
                const recipientId = messageData.recipient_id;

                // Only notify if this message is FOR the current user and NOT from them
                const isIncomingMessage = recipientId === currentUserRef.current && senderId !== currentUserRef.current;
                
                // Skip notification if user is actively viewing this conversation
                const isActiveConversation = activeConversationRef.current === senderId;

                console.log('📡 New message received:', {
                  senderId,
                  recipientId,
                  currentUserId: currentUserRef.current,
                  isIncomingMessage,
                  isActiveConversation
                });

                if (isIncomingMessage && !isActiveConversation) {
                  // Get sender information (but show notification even if this fails)
                  const { data: senderData, error: senderError } = await supabase
                    .from('users')
                    .select('first_name, last_name, avatar_url')
                    .eq('id', senderId)
                    .single();

                  if (senderError) {
                    console.error('📡 Error fetching sender data, will use fallback:', senderError);
                  }

                  // Use sender data or fallback to generic values
                  const senderName = senderData 
                    ? `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || 'Someone'
                    : 'Someone';
                  
                  const messagePreview = messageData.message_text 
                    ? (messageData.message_text.length > 50 
                        ? `${messageData.message_text.substring(0, 50)}...` 
                        : messageData.message_text)
                    : messageData.file_urls?.length 
                      ? '📎 Sent an attachment' 
                      : 'New message';

                  let notificationShown = false;

                  // Show toast notification if enabled
                  if (preferences?.toast_notifications_enabled) {
                    const sender: User = {
                      id: senderId,
                      first_name: senderData?.first_name || '',
                      last_name: senderData?.last_name || '',
                      avatar_url: senderData?.avatar_url || '',
                      email: '',
                      role: undefined,
                      phone_number: undefined
                    };

                    console.log('📡 Showing toast notification for:', senderName);
                    
                    toast(`${senderName}`, {
                      description: messagePreview,
                      action: {
                        label: 'Reply',
                        onClick: () => {
                          console.log('📡 Reply button clicked for:', sender.id);
                          if (onNewMessageRef.current) {
                            onNewMessageRef.current(sender);
                          }
                        }
                      }
                    });

                    notificationShown = true;
                  }

                  // Play sound notification if enabled
                  if (preferences?.sound_notifications_enabled) {
                    console.log('📡 Playing notification sound');
                    const soundPlayed = await audioManager.playNotificationSound();
                    if (!soundPlayed) {
                      console.warn('📡 Failed to play notification sound');
                    }
                  }

                  console.log('📡 Notification processed:', {
                    senderName,
                    toastShown: preferences?.toast_notifications_enabled && notificationShown,
                    soundEnabled: preferences?.sound_notifications_enabled
                  });
                }
              } catch (error) {
                console.error('📡 Error processing notification:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Global chat notifications status:', status);
            
            if (status === 'CHANNEL_ERROR') {
              console.warn('📡 Channel error detected, will retry on next effect cycle');
            }
            
            if (status === 'CLOSED' && !isCleanedUp) {
              console.warn('📡 Channel closed unexpectedly, will retry on next effect cycle');
            }
          });

        console.log('📡 Global notifications setup complete');
      } catch (error) {
        console.error('📡 Error setting up global notifications:', error);
      }
    };

    setupGlobalNotifications();

    return () => {
      console.log('📡 Cleaning up global chat notifications');
      isCleanedUp = true;
      if (channelRef.current) {
        // Use setTimeout to prevent DOM conflicts during cleanup
        setTimeout(async () => {
          try {
            if (channelRef.current) {
              await supabase.removeChannel(channelRef.current);
            }
          } catch (error) {
            console.warn('📡 Error removing channel:', error);
          }
        }, 0);
        channelRef.current = null;
      }
    };
  }, [preferences?.toast_notifications_enabled, preferences?.sound_notifications_enabled]); // Removed activeConversationUserId from deps
};