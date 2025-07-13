import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BASE_TITLE = 'BuilderSuite AI - Construction Management Platform';

export function useDocumentTitle() {
  const [totalUnread, setTotalUnread] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Load total unread count
  useEffect(() => {
    if (!currentUserId) return;

    const loadTotalUnread = async () => {
      try {
        const { data: totalCount } = await supabase
          .rpc('get_total_unread_count', {
            user_id_param: currentUserId
          });
        
        setTotalUnread(totalCount || 0);
      } catch (error) {
        console.error('Error loading total unread count:', error);
      }
    };

    loadTotalUnread();

    // Set up real-time listener for unread count updates
    const channel = supabase
      .channel('document_title_updates')
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

          // Update total unread count
          setTotalUnread(current => current + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Update document title when unread count changes

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [totalUnread]);

  return { totalUnread };
}