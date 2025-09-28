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
  const isSetupInProgress = useRef(false);
  
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

  // Setup realtime connection
  const setupMasterRealtime = useCallback(async () => {
    // Prevent multiple simultaneous setups
    if (isSetupInProgress.current || connectionState === 'connecting') {
      console.log('🚀 Setup already in progress, skipping');
      return;
    }

    try {
      isSetupInProgress.current = true;
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        isSetupInProgress.current = false;
        return;
      }

      currentUserRef.current = authUser.id;
      globalChannelUsers.add(instanceId.current);
      
      console.log('🚀 Setting up MASTER chat realtime for user:', authUser.id, 'instance:', instanceId.current);
      setConnectionState('connecting');

      // If global channel already exists and is healthy, reuse it
      if (globalChannel && (globalChannel.state === 'joined' || globalChannel.state === 'joining')) {
        console.log('🚀 Reusing existing healthy global channel');
        channelRef.current = globalChannel;
        setConnectionState('connected');
        isSetupInProgress.current = false;
        return;
      }

      // Clean up existing unhealthy channel
      if (globalChannel) {
        console.log('🚀 Cleaning up unhealthy global channel');
        try {
          await supabase.removeChannel(globalChannel);
        } catch (error) {
          console.warn('🚀 Error removing existing channel:', error);
        }
        globalChannel = null;
      }

      // Create new channel
      const channelName = `master_chat_${authUser.id}`;
      console.log('🚀 Creating master channel:', channelName);

      const newChannel = supabase.channel(channelName, {
        config: {
          presence: {
            key: authUser.id,
          },
        },
      });

      // Handle realtime message updates
      newChannel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${authUser.id}`
        }, async (payload) => {
          console.log('🚀 New message received:', payload);
          setConnectionState('connected');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful message

          const messageData = payload.new;
          const senderId = messageData.sender_id;
          const isActiveConversation = activeConversationRef.current === senderId;

          // Update unread count
          if (!isActiveConversation) {
            setUnreadCounts(prev => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1
            }));

            if (callbacksRef.current.onUnreadCountChange) {
              callbacksRef.current.onUnreadCountChange(senderId, (unreadCounts[senderId] || 0) + 1);
            }
          }

          // Trigger callback for new message
          if (callbacksRef.current.onNewMessage) {
            callbacksRef.current.onNewMessage(messageData, isActiveConversation);
          }

          // Handle notifications
          if (enableNotifications && (!isActiveConversation || notifyWhileActive)) {
            console.log('🚀 Processing notification for message from:', senderId);
            
            // Get sender information
            const { data: senderData } = await supabase
              .from('users')
              .select('first_name, last_name, company_name')
              .eq('id', senderId)
              .single();

            if (senderData) {
              const sender: User = {
                id: senderId,
                first_name: senderData.first_name || '',
                last_name: senderData.last_name || '',
                email: '',
                role: 'employee',
                company_name: senderData.company_name || ''
              };

              const senderName = `${sender.first_name} ${sender.last_name}`.trim() || sender.company_name || 'Unknown User';
              const messagePreview = messageData.message_text || 'New message';

              // Show toast notification if preferences allow (with fallback to true if preferences not loaded)
              const shouldShowToast = preferences?.toast_notifications_enabled ?? true;
              if (shouldShowToast) {
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
                  await audioManager.getAudioContext();
                  const soundPlayed = await audioManager.playNotificationSound();
                  if (!soundPlayed) {
                    console.log('🚀 Could not play notification sound - user interaction required');
                  }
                } catch (soundError) {
                  console.error('🚀 Error playing notification sound:', soundError);
                }
              }
            }
          }
        })
        .subscribe((status) => {
          console.log('🚀 Master chat subscription status:', status, 'instance:', instanceId.current);
          
          if (status === 'SUBSCRIBED') {
            setConnectionState('connected');
            reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            
            // Clear any pending reconnection attempts
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('🚀 Channel error detected', 'instance:', instanceId.current);
            setConnectionState('error');
            // Don't auto-reconnect on channel errors to prevent loops
          } else if (status === 'CLOSED') {
            console.warn('🚀 Channel closed', 'instance:', instanceId.current);
            setConnectionState('disconnected');
            // Don't auto-reconnect on close to prevent loops - let user action trigger reconnect
          }
        });

      channelRef.current = newChannel;
      globalChannel = newChannel;
      console.log('🚀 Master realtime setup complete', 'instance:', instanceId.current);
    } catch (error) {
      console.error('🚀 Error setting up master realtime:', error);
      setConnectionState('error');
    } finally {
      isSetupInProgress.current = false;
    }
  }, [user?.id, preferences, preferencesLoading, enableNotifications, notifyWhileActive]);

  // Manual reconnect function (no auto-reconnect to prevent loops)
  const reconnectChannel = useCallback(() => {
    if (reconnectAttemptsRef.current >= 3) {
      console.log('🚀 Max reconnection attempts reached');
      setConnectionState('error');
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(`🚀 Manual reconnect attempt ${reconnectAttemptsRef.current}`);
    
    // Clear existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Setup after short delay
    reconnectTimeoutRef.current = setTimeout(() => {
      setupMasterRealtime();
    }, 1000);
  }, [setupMasterRealtime]);

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
    markConversationAsRead,
    reconnectChannel
  };
};