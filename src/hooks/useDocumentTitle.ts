import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BASE_TITLE = 'BuilderSuite AI';

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
        
        console.log('Loaded total unread count:', totalCount);
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
          console.log('Document title: New message received:', newMessage);
          
          // Only process if this message is not from current user
          if (newMessage.sender_id === currentUserId) {
            console.log('Document title: Message from current user, ignoring');
            return;
          }

          // Check if current user is participant in this room
          const { data: isParticipant } = await supabase
            .rpc('is_room_participant', {
              _room_id: newMessage.room_id,
              _user_id: currentUserId
            });

          if (!isParticipant) {
            console.log('Document title: User not participant, ignoring');
            return;
          }

          console.log('Document title: Incrementing unread count');
          // Update total unread count
          setTotalUnread(current => {
            const newCount = current + 1;
            console.log('Document title: Unread count updated from', current, 'to', newCount);
            return newCount;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Create simple red circle favicon with white number
  const updateFavicon = (count: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = 32;
    canvas.height = 32;
    
    if (count > 0) {
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, 32, 32);
      
      // Draw red circle
      ctx.fillStyle = '#ef4444'; // Red color
      ctx.beginPath();
      ctx.arc(16, 16, 15, 0, 2 * Math.PI); // Centered circle
      ctx.fill();
      
      // Draw white number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Handle numbers > 99
      const displayCount = count > 99 ? '99+' : count.toString();
      ctx.fillText(displayCount, 16, 16);
      
      // Update favicon
      const dataURL = canvas.toDataURL('image/png');
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      
      favicon.href = dataURL;
    } else {
      // Reset to original favicon when no unread messages
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = '/src/assets/buildersuiteai-logo.png';
      }
    }
  };

  // Update document title and favicon when unread count changes
  useEffect(() => {
    console.log('Document title: Updating title and favicon with unread count:', totalUnread);
    
    // Always show just the base title (no count in text)
    document.title = BASE_TITLE;
    
    // Update favicon with red circle (only when there are unread messages)
    updateFavicon(totalUnread);
  }, [totalUnread]);

  // Listen for when rooms are marked as read to decrease the count
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('document_title_read_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employee_chat_participants',
          filter: `user_id=eq.${currentUserId}`
        },
        async () => {
          console.log('Document title: Room marked as read, refreshing total count');
          // Refresh total unread count when participant records are updated (last_read_at changes)
          try {
            const { data: totalCount } = await supabase
              .rpc('get_total_unread_count', {
                user_id_param: currentUserId
              });
            
            console.log('Document title: Refreshed total unread count:', totalCount);
            setTotalUnread(totalCount || 0);
          } catch (error) {
            console.error('Error refreshing total unread count:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return { totalUnread };
}
