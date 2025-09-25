import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationPreferences } from './useNotificationPreferences';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { audioManager } from '@/utils/audioManager';
import { User } from './useCompanyUsers';

export interface UnreadCounts {
  [userId: string]: number;
}

export interface MasterChatCallbacks {
  onNewMessage?: (message: any, isActiveConversation: boolean) => void;
  onUnreadCountChange?: (senderId: string, newCount: number) => void;
  onNotificationTrigger?: (sender: User, message: any) => void;
}

export interface MasterChatOptions {
  enableNotifications?: boolean;
  notifyWhileActive?: boolean;
}

// Global channel management to prevent multiple instances
let globalChannel: any = null;
let globalChannelUsers = new Set<string>();

export const useMasterChatRealtime = (
  activeConversationUserId: string | null,
  callbacks: MasterChatCallbacks = {},
  options: MasterChatOptions = {}
) => {
  const { enableNotifications = true, notifyWhileActive = true } = options;
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);
  const activeConversationRef = useRef<string | null>(activeConversationUserId);
  const callbacksRef = useRef(callbacks);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  const { user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useNotificationPreferences();

  // Update refs when values change
  activeConversationRef.current = activeConversationUserId;
  callbacksRef.current = callbacks;

  // Fetch unread counts for specific users
  const fetchUnreadCounts = useCallback(async (userIds: string[]) => {
    if (!user?.id || userIds.length === 0) {
      setUnreadCounts({});
      return {};
    }

    setIsLoading(true);
    try {
      const counts: UnreadCounts = {};
      
      for (const userId of userIds) {
        const { data, error } = await supabase.rpc('get_conversation_unread_count', {
          other_user_id_param: userId
        });

        if (error) {
          console.error('📧 Error fetching unread count for user:', userId, error);
          counts[userId] = 0;
        } else {
          counts[userId] = data || 0;
        }
      }

      setUnreadCounts(counts);
      return counts;
    } catch (error) {
      console.error('📧 Error fetching unread counts:', error);
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (otherUserId: string) => {
    try {
      await supabase.rpc('mark_conversation_as_read', {
        other_user_id_param: otherUserId
      });
      
      // Update local state immediately
      setUnreadCounts(prev => ({
        ...prev,
        [otherUserId]: 0
      }));
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, []);

  // Auto-reconnect function
  const reconnectChannel = useCallback(async () => {
    if (reconnectAttemptsRef.current >= 5) {
      console.log('🚀 Max reconnection attempts reached, giving up');
      setConnectionState('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    console.log(`🚀 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      setConnectionState('connecting');
      await setupMasterRealtime();
    }, delay);
  }, []);

  const setupMasterRealtime = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      currentUserRef.current = authUser.id;
      globalChannelUsers.add(instanceId.current);
      
      console.log('🚀 Setting up MASTER chat realtime for user:', authUser.id, 'instance:', instanceId.current);
      setConnectionState('connecting');

      // Use global channel if it exists and is connected, otherwise create new one
      if (globalChannel && globalChannel.state === 'joined') {
        console.log('🚀 Reusing existing global channel');
        channelRef.current = globalChannel;
        setConnectionState('connected');
        return;
      }

      // Clean up existing channel
      if (globalChannel) {
        console.log('🚀 Cleaning up existing global channel');
        try {
          await supabase.removeChannel(globalChannel);
        } catch (error) {
          console.warn('🚀 Error removing existing channel:', error);
        }
        globalChannel = null;
      }

      // Create single stable channel for this user
      const channelName = `master_chat_${authUser.id}`;
      console.log('🚀 Creating master channel:', channelName);
      
      globalChannel = supabase
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
              
              if (!messageData || !currentUserRef.current) return;

              const senderId = messageData.sender_id;
              const recipientId = messageData.recipient_id;

              // Check if this is an incoming message for the current user
              const isIncomingMessage = recipientId === currentUserRef.current && senderId !== currentUserRef.current;
              const isActiveConversation = activeConversationRef.current === senderId;

                console.log('🚀 New message processed:', {
                senderId,
                recipientId,
                currentUserId: currentUserRef.current,
                isIncomingMessage,
                isActiveConversation,
                preferencesLoaded: !preferencesLoading,
                preferences: preferences ? 'loaded' : 'not loaded',
                instanceId: instanceId.current
              });

              if (isIncomingMessage) {
                // Update unread count for ALL instances
                setUnreadCounts(prev => {
                  const newCounts = {
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1
                  };
                  
                  // Notify all components about the change
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('unread-count-changed', {
                      detail: { userId: senderId, count: newCounts[senderId] }
                    }));
                  }, 0);
                  
                  return newCounts;
                });

                // Trigger unread count callback
                if (callbacksRef.current.onUnreadCountChange) {
                  callbacksRef.current.onUnreadCountChange(senderId, (unreadCounts[senderId] || 0) + 1);
                }

                // If user is actively viewing this conversation, add message to UI
                if (isActiveConversation && callbacksRef.current.onNewMessage) {
                  // Get sender info for message display
                  const { data: senderData } = await supabase
                    .from('users')
                    .select('first_name, last_name, avatar_url')
                    .eq('id', senderId)
                    .single();

                  const formattedMessage = {
                    id: messageData.id,
                    message_text: messageData.message_text,
                    file_urls: messageData.file_urls,
                    created_at: messageData.created_at,
                    sender_id: senderId,
                    sender_name: senderData 
                      ? `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim()
                      : 'Someone',
                    sender_avatar: senderData?.avatar_url || null
                  };

                  callbacksRef.current.onNewMessage(formattedMessage, true);
                }

                // Show notifications - ensure enabled and either preferences loaded or use defaults
                if (enableNotifications && (notifyWhileActive || !isActiveConversation)) {
                  // Get sender information for notifications
                  const { data: senderData } = await supabase
                    .from('users')
                    .select('first_name, last_name, avatar_url')
                    .eq('id', senderId)
                    .single();

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

                  // Show toast notification if enabled (with fallback to true if preferences not loaded)
                  const shouldShowToast = preferences?.toast_notifications_enabled ?? true;
                  if (shouldShowToast) {
                    const sender: User = {
                      id: senderId,
                      first_name: senderData?.first_name || '',
                      last_name: senderData?.last_name || '',
                      avatar_url: senderData?.avatar_url || '',
                      email: '',
                      role: undefined,
                      phone_number: undefined
                    };

                    console.log('🚀 Showing toast notification for:', senderName);
                    
                    try {
                      toast(`${senderName}`, {
                        description: messagePreview,
                        duration: 5000,
                        action: {
                          label: 'Reply',
                          onClick: () => {
                            console.log('🚀 Reply button clicked for:', sender.id);
                            if (callbacksRef.current.onNotificationTrigger) {
                              callbacksRef.current.onNotificationTrigger(sender, messageData);
                            }
                          }
                        }
                      });
                    } catch (toastError) {
                      console.error('🚀 Error showing toast:', toastError);
                    }
                  }

                  // Play sound notification if enabled (with fallback to true if preferences not loaded)
                  const shouldPlaySound = preferences?.sound_notifications_enabled ?? true;
                  if (shouldPlaySound) {
                    console.log('🚀 Playing notification sound for:', senderName);
                    
                    try {
                      // Ensure audio context is ready for user interaction
                      await audioManager.getAudioContext();
                      
                      const soundPlayed = await audioManager.playNotificationSound();
                      if (soundPlayed) {
                        console.log('🚀 ✅ Notification sound played successfully');
                      } else {
                        console.warn('🚀 ❌ Failed to play notification sound - will retry once');
                        
                        setTimeout(async () => {
                          try {
                            const retryResult = await audioManager.playNotificationSound();
                            console.log('🚀 🔄 Sound retry result:', retryResult);
                          } catch (retryError) {
                            console.error('🚀 🔄 Sound retry failed:', retryError);
                          }
                        }, 500);
                      }
                    } catch (error) {
                      console.error('🚀 ❌ Error playing notification sound:', error);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('🚀 Error processing message:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_chat_messages'
          },
          (payload) => {
            const messageData = payload.new;
            if (!messageData || !currentUserRef.current) return;

            const senderId = messageData.sender_id;
            const recipientId = messageData.recipient_id;

            // If a message was read (read_at changed), update unread count
            if (recipientId === currentUserRef.current) {
              // Refresh unread count for this sender
              setTimeout(async () => {
                try {
                  const { data } = await supabase.rpc('get_conversation_unread_count', {
                    other_user_id_param: senderId
                  });
                  
                  setUnreadCounts(prev => ({
                    ...prev,
                    [senderId]: data || 0
                  }));
                } catch (error) {
                  console.error('🚀 Error updating unread count:', error);
                }
              }, 200);
            }
          }
        )
        .subscribe((status) => {
          console.log('🚀 Master chat subscription status:', status, 'instance:', instanceId.current);
          
          if (status === 'SUBSCRIBED') {
            console.log('🚀 ✅ Master chat realtime is now active!', 'instance:', instanceId.current);
            setConnectionState('connected');
            reconnectAttemptsRef.current = 0; // Reset on successful connection
            
            // Clear any pending reconnection attempts
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('🚀 Channel error detected, will attempt reconnection', 'instance:', instanceId.current);
            setConnectionState('error');
            reconnectChannel();
          } else if (status === 'CLOSED') {
            console.warn('🚀 Channel closed, will attempt reconnection', 'instance:', instanceId.current);
            setConnectionState('error');
            reconnectChannel();
          }
        });

      channelRef.current = globalChannel;
      console.log('🚀 Master realtime setup complete', 'instance:', instanceId.current);
    } catch (error) {
      console.error('🚀 Error setting up master realtime:', error);
      setConnectionState('error');
      reconnectChannel();
    }
  }, [user?.id, preferences, preferencesLoading, enableNotifications, notifyWhileActive, reconnectChannel]);

  useEffect(() => {
    let isCleanedUp = false;

    if (user?.id && !isCleanedUp) {
      setupMasterRealtime();
    }

    return () => {
      console.log('🚀 Cleaning up master chat realtime', 'instance:', instanceId.current);
      isCleanedUp = true;
      
      // Remove this instance from global users
      globalChannelUsers.delete(instanceId.current);
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Reset connection attempts
      reconnectAttemptsRef.current = 0;
      setConnectionState('disconnected');
      
      // Only remove global channel if no other instances are using it
      if (globalChannelUsers.size === 0 && globalChannel) {
        console.log('🚀 Removing global channel - no more instances');
        try {
          supabase.removeChannel(globalChannel);
          globalChannel = null;
        } catch (error) {
          console.warn('🚀 Error removing global channel:', error);
        }
      }
      
      channelRef.current = null;
    };
  }, [setupMasterRealtime]);

  return {
    unreadCounts,
    isLoading,
    connectionState,
    fetchUnreadCounts,
    markConversationAsRead
  };
};