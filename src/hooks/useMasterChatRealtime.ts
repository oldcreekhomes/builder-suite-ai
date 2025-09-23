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

export const useMasterChatRealtime = (
  activeConversationUserId: string | null,
  callbacks: MasterChatCallbacks = {},
  options: MasterChatOptions = {}
) => {
  const { enableNotifications = true, notifyWhileActive = true } = options;
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);
  const activeConversationRef = useRef<string | null>(activeConversationUserId);
  const callbacksRef = useRef(callbacks);
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();

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

  useEffect(() => {
    let isCleanedUp = false;

    const setupMasterRealtime = async () => {
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || isCleanedUp) return;

        currentUserRef.current = authUser.id;
        console.log('🚀 Setting up MASTER chat realtime for user:', authUser.id);

        // Clean up existing channel
        if (channelRef.current) {
          console.log('🚀 Cleaning up existing channel');
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Create single stable channel for this user
        const channelName = `master_chat_${authUser.id}`;
        console.log('🚀 Creating master channel:', channelName);
        
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

                // Check if this is an incoming message for the current user
                const isIncomingMessage = recipientId === currentUserRef.current && senderId !== currentUserRef.current;
                const isActiveConversation = activeConversationRef.current === senderId;

                console.log('🚀 New message processed:', {
                  senderId,
                  recipientId,
                  currentUserId: currentUserRef.current,
                  isIncomingMessage,
                  isActiveConversation
                });

                if (isIncomingMessage) {
                  // Update unread count
                  setUnreadCounts(prev => ({
                    ...prev,
                    [senderId]: (prev[senderId] || 0) + 1
                  }));

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

                  // Show notifications based on options
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

                      console.log('🚀 Showing toast notification for:', senderName);
                      
                      toast(`${senderName}`, {
                        description: messagePreview,
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
                    }

                    // Play sound notification if enabled
                    if (preferences?.sound_notifications_enabled) {
                      console.log('🚀 Playing notification sound for:', senderName);
                      
                      try {
                        const soundPlayed = await audioManager.playNotificationSound();
                        if (soundPlayed) {
                          console.log('🚀 ✅ Notification sound played successfully');
                        } else {
                          console.warn('🚀 ❌ Failed to play notification sound - will retry once');
                          
                          setTimeout(async () => {
                            const retryResult = await audioManager.playNotificationSound();
                            console.log('🚀 🔄 Sound retry result:', retryResult);
                          }, 100);
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
              if (isCleanedUp) return;
              
              const messageData = payload.new;
              if (!messageData || !currentUserRef.current) return;

              const senderId = messageData.sender_id;
              const recipientId = messageData.recipient_id;

              // If a message was read (read_at changed), update unread count
              if (recipientId === currentUserRef.current) {
                // Refresh unread count for this sender
                setTimeout(async () => {
                  if (!isCleanedUp) {
                    const { data } = await supabase.rpc('get_conversation_unread_count', {
                      other_user_id_param: senderId
                    });
                    
                    setUnreadCounts(prev => ({
                      ...prev,
                      [senderId]: data || 0
                    }));
                  }
                }, 200);
              }
            }
          )
          .subscribe((status) => {
            console.log('🚀 Master chat subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('🚀 ✅ Master chat realtime is now active!');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('🚀 Channel error detected, will retry on next effect cycle');
            } else if (status === 'CLOSED' && !isCleanedUp) {
              console.warn('🚀 Channel closed unexpectedly, will retry on next effect cycle');
            }
          });

        console.log('🚀 Master realtime setup complete');
      } catch (error) {
        console.error('🚀 Error setting up master realtime:', error);
      }
    };

    setupMasterRealtime();

    return () => {
      console.log('🚀 Cleaning up master chat realtime');
      isCleanedUp = true;
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        } catch (error) {
          console.warn('🚀 Error removing channel:', error);
        }
      }
    };
  }, [user?.id]); // Minimize dependencies to prevent unnecessary re-runs

  return {
    unreadCounts,
    isLoading,
    fetchUnreadCounts,
    markConversationAsRead
  };
};