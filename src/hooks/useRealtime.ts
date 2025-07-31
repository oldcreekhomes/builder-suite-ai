import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from './useCompanyUsers';
import { useNotificationPreferences } from './useNotificationPreferences';
import { toast } from 'sonner';

export const useRealtime = (
  selectedUser: User | null,
  addMessage: (message: any) => void
) => {
  const channelRef = useRef<any>(null);
  const currentUserRef = useRef<string | null>(null);
  const currentUserProfileRef = useRef<any>(null);

  useEffect(() => {
    const setupRealtime = async () => {
      if (!selectedUser) {
        if (channelRef.current) {
          console.log('🧹 Cleaning up channel - no selected user');
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return;
      }

      currentUserRef.current = user.id;
      console.log('👤 Current user:', user.id);
      console.log('👤 Selected user:', selectedUser.id);

      // Fetch current user's profile to get avatar and name
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      currentUserProfileRef.current = currentUserProfile;
      console.log('👤 Current user profile:', currentUserProfile);

      // Clean up existing channel first
      if (channelRef.current) {
        console.log('🧹 Cleaning up existing channel');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Use simple channel name for debugging
      const channelName = `chat_messages_${Date.now()}`;
      console.log('📡 Setting up real-time subscription:', channelName);

      // Subscribe to ALL user_chat_messages changes and filter client-side
      // This is more reliable than complex database filtering
      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_chat_messages'
            // No filter - we'll filter on client side for reliability
          },
          async (payload) => {
            console.log('📨 Real-time event received:', {
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            });

            const messageData = payload.new || payload.old;
            
            // Client-side filtering - check if message is relevant to current conversation
            if (messageData && selectedUser && currentUserRef.current) {
              // Type guard to ensure messageData has the expected properties
              const hasRequiredFields = 
                typeof messageData === 'object' && 
                'sender_id' in messageData && 
                'recipient_id' in messageData;

              if (!hasRequiredFields) {
                console.log('⚠️ Message data missing required fields');
                return;
              }

              const senderId = (messageData as any).sender_id;
              const recipientId = (messageData as any).recipient_id;

              const isRelevant = (
                (senderId === currentUserRef.current && recipientId === selectedUser.id) ||
                (senderId === selectedUser.id && recipientId === currentUserRef.current)
              );

              console.log('🔍 Message relevance check:', {
                isRelevant,
                messageSender: senderId,
                messageRecipient: recipientId,
                currentUser: currentUserRef.current,
                selectedUser: selectedUser.id
              });

              if (isRelevant) {
                console.log('✅ Relevant message detected - adding new message');
                // Create message object with sender info for display
                const isCurrentUser = senderId === currentUserRef.current;
                const currentUserProfile = currentUserProfileRef.current;
                
                const newMessage = {
                  id: (messageData as any).id,
                  message_text: (messageData as any).message_text,
                  file_urls: (messageData as any).file_urls,
                  created_at: (messageData as any).created_at,
                  sender_id: senderId,
                  sender_name: isCurrentUser 
                    ? (currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : 'You')
                    : `${selectedUser.first_name} ${selectedUser.last_name}`,
                  sender_avatar: isCurrentUser 
                    ? (currentUserProfile?.avatar_url || null)
                    : selectedUser.avatar_url
                };
                addMessage(newMessage);
              } else {
                console.log('⏭️ Message not relevant to current conversation');
              }
            } else {
              console.log('⚠️ Missing context for message filtering:', {
                hasMessageData: !!messageData,
                hasSelectedUser: !!selectedUser,
                hasCurrentUser: !!currentUserRef.current
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status changed:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time messaging is now active!');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out - retrying in 2 seconds...');
            setTimeout(() => {
              console.log('🔄 Retrying real-time setup...');
              setupRealtime();
            }, 2000);
          } else if (status === 'CLOSED') {
            console.log('🔒 Real-time subscription closed');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel error - retrying in 3 seconds...');
            setTimeout(() => {
              console.log('🔄 Retrying after channel error...');
              setupRealtime();
            }, 3000);
          }
        });
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up real-time subscription on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedUser, addMessage]);
};