import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { notificationEngine } from '@/utils/notificationEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UnreadCounts {
  [userId: string]: number;
}

export interface MasterChatCallbacks {
  onNewMessage?: (message: any, isActiveConversation: boolean) => void;
  onUnreadCountChange?: (counts: UnreadCounts) => void;
  onNotificationTrigger?: (message: any) => void;
}

export interface MasterChatOptions {
  enableNotifications?: boolean;
  notifyWhileActive?: boolean;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export const useMasterChatRealtime = (
  activeConversationUserId: string | null,
  callbacks: MasterChatCallbacks = {},
  options: MasterChatOptions = {}
) => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentUserRef = useRef(user);
  const activeConversationRef = useRef(activeConversationUserId);
  const callbacksRef = useRef(callbacks);
  const optionsRef = useRef(options);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastMessageAtRef = useRef(Date.now());
  const healthCheckIntervalRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef(new Set<string>());
  const reconcileIntervalRef = useRef<number | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 30000;
  const HEALTH_CHECK_INTERVAL = 10000;
  const STALE_THRESHOLD = 30000;
  const POLL_INTERVAL = 15000;
  const RECONCILE_INTERVAL = 60000;

  // Update refs when props change
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  useEffect(() => {
    activeConversationRef.current = activeConversationUserId;
  }, [activeConversationUserId]);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Fetch unread counts with retry logic
  const fetchUnreadCounts = useCallback(async (userIds?: string[]) => {
    if (!currentUserRef.current) return;

    try {
      console.log('💬 MasterChat: Fetching unread counts');
      
      if (userIds && userIds.length > 0) {
        const counts: UnreadCounts = {};
        
        await Promise.all(
          userIds.map(async (userId) => {
            try {
              const { data, error } = await supabase.rpc('get_conversation_unread_count', {
                other_user_id_param: userId,
              });

              if (error) throw error;
              counts[userId] = data || 0;
            } catch (error) {
              console.error('💬 MasterChat: Error fetching count for user', userId, error);
              counts[userId] = 0;
            }
          })
        );

        setUnreadCounts(counts);
        callbacksRef.current.onUnreadCountChange?.(counts);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('💬 MasterChat: Error in fetchUnreadCounts:', error);
      setIsLoading(false);
    }
  }, []);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (otherUserId: string) => {
    if (!currentUserRef.current) return;

    try {
      console.log('💬 MasterChat: Marking conversation as read:', otherUserId);

      await supabase.rpc('mark_conversation_as_read', {
        other_user_id_param: otherUserId,
      });

      setUnreadCounts(prev => {
        const updated = { ...prev, [otherUserId]: 0 };
        callbacksRef.current.onUnreadCountChange?.(updated);
        return updated;
      });

      // Broadcast to other tabs
      try {
        const bc = new BroadcastChannel('chat-unread-sync');
        bc.postMessage({ type: 'mark-read', userId: otherUserId });
        bc.close();
      } catch (e) {
        console.warn('💬 MasterChat: BroadcastChannel not available');
      }
    } catch (error) {
      console.error('💬 MasterChat: Error marking as read:', error);
    }
  }, []);

  // Calculate reconnect delay with exponential backoff and jitter
  const getReconnectDelay = useCallback(() => {
    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }, []);

  // Reconnect function
  const reconnectChannel = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('💬 MasterChat: Max reconnect attempts reached');
      setConnectionState('error');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = getReconnectDelay();
    console.log(`💬 MasterChat: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
    
    setConnectionState('connecting');
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectAttemptsRef.current++;
      setupMasterRealtime();
    }, delay);
  }, [getReconnectDelay]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    console.log('💬 MasterChat: Starting polling fallback');
    
    pollIntervalRef.current = window.setInterval(async () => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageAtRef.current;
      const isStale = timeSinceLastMessage > STALE_THRESHOLD;
      const isDisconnected = connectionState !== 'connected';

      if (isDisconnected || isStale || document.hidden) {
        console.log('💬 MasterChat: Polling for updates', { isDisconnected, isStale, hidden: document.hidden });
        
        // Poll unread counts (server-truth reconciliation)
        await fetchUnreadCounts();
        
        // If we have an active conversation, also poll messages
        if (activeConversationRef.current) {
          try {
            const { data: messages } = await supabase
              .from('user_chat_messages')
              .select('*')
              .or(`sender_id.eq.${activeConversationRef.current},receiver_id.eq.${activeConversationRef.current}`)
              .order('created_at', { ascending: false })
              .limit(20);

            if (messages) {
              // Check for new messages we haven't seen
              messages.forEach(msg => {
                if (!seenMessageIdsRef.current.has(msg.id)) {
                  seenMessageIdsRef.current.add(msg.id);
                  callbacksRef.current.onNewMessage?.(msg, true);
                }
              });
            }
          } catch (error) {
            console.error('💬 MasterChat: Error polling messages:', error);
          }
        }
      }
    }, POLL_INTERVAL);
  }, [connectionState, fetchUnreadCounts]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      console.log('💬 MasterChat: Stopping polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Health check watchdog
  const startHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) return;

    healthCheckIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageAtRef.current;
      const channel = channelRef.current;

      if (!channel) {
        console.warn('💬 MasterChat: No channel in health check, reconnecting');
        reconnectChannel();
        return;
      }

      // Check if channel is stale
      if (timeSinceLastMessage > STALE_THRESHOLD && connectionState === 'connected') {
        console.warn('💬 MasterChat: Channel stale, reconnecting');
        reconnectChannel();
      }
    }, HEALTH_CHECK_INTERVAL);
  }, [connectionState, reconnectChannel]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  // Server-truth reconciliation
  const startReconciliation = useCallback(() => {
    if (reconcileIntervalRef.current) return;

    reconcileIntervalRef.current = window.setInterval(async () => {
      console.log('💬 MasterChat: Reconciling unread counts with server');
      await fetchUnreadCounts();
    }, RECONCILE_INTERVAL);
  }, [fetchUnreadCounts]);

  const stopReconciliation = useCallback(() => {
    if (reconcileIntervalRef.current) {
      clearInterval(reconcileIntervalRef.current);
      reconcileIntervalRef.current = null;
    }
  }, []);

  // Main realtime setup
  const setupMasterRealtime = useCallback(async () => {
    if (!currentUserRef.current?.id) {
      console.log('💬 MasterChat: No user, skipping setup');
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      console.log('💬 MasterChat: Cleaning up existing channel');
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      console.log('💬 MasterChat: Setting up master realtime channel');
      setConnectionState('connecting');

      const channel = supabase.channel(`master-chat-${currentUserRef.current.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUserRef.current.id },
        },
      });

      channelRef.current = channel;

      // Listen for new messages
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_chat_messages',
            filter: `receiver_id=eq.${currentUserRef.current.id}`,
          },
          async (payload) => {
            console.log('💬 MasterChat: New message received', payload);
            lastMessageAtRef.current = Date.now();
            
            const message = payload.new;
            const senderId = message.sender_id;
            
            // Deduplicate
            if (seenMessageIdsRef.current.has(message.id)) {
              console.log('💬 MasterChat: Duplicate message, skipping', message.id);
              return;
            }
            seenMessageIdsRef.current.add(message.id);

            const isActiveConversation = senderId === activeConversationRef.current;

            // Update unread count
            if (!isActiveConversation) {
              setUnreadCounts(prev => {
                const updated = {
                  ...prev,
                  [senderId]: (prev[senderId] || 0) + 1,
                };
                callbacksRef.current.onUnreadCountChange?.(updated);
                return updated;
              });
            }

            // Trigger callbacks
            callbacksRef.current.onNewMessage?.(message, isActiveConversation);

            // Handle notifications via notification engine
            if (optionsRef.current.enableNotifications !== false) {
              try {
                // Fetch sender info from users table
                const { data: senderData } = await supabase
                  .from('users')
                  .select('first_name, last_name, email')
                  .eq('id', senderId)
                  .single();

                const senderName = senderData 
                  ? `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || senderData.email || 'Someone'
                  : 'Someone';

                notificationEngine.notifyNewMessage({
                  id: message.id,
                  senderId,
                  senderName,
                  content: message.content || '',
                  isActiveConversation,
                  timestamp: Date.now(),
                });
              } catch (error) {
                console.error('💬 MasterChat: Error fetching sender info:', error);
              }
            }
          }
        )
        .subscribe(async (status) => {
          console.log('💬 MasterChat: Channel status:', status);

          if (status === 'SUBSCRIBED') {
            console.log('💬 MasterChat: Successfully subscribed');
            setConnectionState('connected');
            reconnectAttemptsRef.current = 0;
            lastMessageAtRef.current = Date.now();
            
            // Reconcile unread counts on connection
            await fetchUnreadCounts();
            
            // Start health check and reconciliation
            startHealthCheck();
            startReconciliation();
            stopPolling(); // Stop polling when connected
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('💬 MasterChat: Channel error:', status);
            setConnectionState('error');
            stopHealthCheck();
            stopReconciliation();
            startPolling(); // Start polling as fallback
            reconnectChannel();
          } else if (status === 'CLOSED') {
            console.warn('💬 MasterChat: Channel closed');
            setConnectionState('disconnected');
            stopHealthCheck();
            stopReconciliation();
            startPolling();
            reconnectChannel();
          }
        });
    } catch (error) {
      console.error('💬 MasterChat: Error setting up channel:', error);
      setConnectionState('error');
      startPolling();
      reconnectChannel();
    }
  }, [fetchUnreadCounts, reconnectChannel, startHealthCheck, stopHealthCheck, startPolling, stopPolling, startReconciliation, stopReconciliation]);

  // Visibility and focus handlers
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && currentUserRef.current) {
        console.log('💬 MasterChat: Tab visible, reconciling');
        await fetchUnreadCounts();
        
        if (connectionState !== 'connected') {
          reconnectChannel();
        }
      }
    };

    const handleFocus = async () => {
      console.log('💬 MasterChat: Window focused, reconciling');
      await fetchUnreadCounts();
    };

    const handleOnline = () => {
      console.log('💬 MasterChat: Network online, reconnecting');
      reconnectChannel();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [connectionState, fetchUnreadCounts, reconnectChannel]);

  // Listen for cross-tab sync
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('chat-unread-sync');
      bc.onmessage = (event) => {
        if (event.data.type === 'mark-read') {
          setUnreadCounts(prev => {
            const updated = { ...prev, [event.data.userId]: 0 };
            return updated;
          });
        }
      };

      return () => bc.close();
    } catch (e) {
      console.warn('💬 MasterChat: BroadcastChannel not available');
    }
  }, []);

  // Main setup and cleanup
  useEffect(() => {
    if (!user) return;

    setupMasterRealtime();
    startPolling(); // Start polling immediately as backup

    return () => {
      console.log('💬 MasterChat: Cleaning up');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      stopHealthCheck();
      stopPolling();
      stopReconciliation();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      seenMessageIdsRef.current.clear();
    };
  }, [user, setupMasterRealtime, startPolling, stopHealthCheck, stopPolling, stopReconciliation]);

  return {
    unreadCounts,
    isLoading,
    connectionState,
    fetchUnreadCounts,
    markConversationAsRead,
    reconnectChannel,
  };
};
