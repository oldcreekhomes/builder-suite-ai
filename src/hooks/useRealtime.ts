import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatRoom {
  id: string;
  name?: string;
  is_direct_message: boolean;
  updated_at: string;
}

export const useRealtime = (
  selectedRoom: ChatRoom | null,
  fetchMessages: (roomId: string) => Promise<void>
) => {
  // Set up real-time subscription when room is selected
  useEffect(() => {
    if (!selectedRoom) return;

    console.log('Setting up real-time subscription for room:', selectedRoom.id);

    const channel = supabase
      .channel(`messages_${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`
        },
        (payload) => {
          console.log('New message received via realtime:', payload);
          // Always refresh messages to show new message
          fetchMessages(selectedRoom.id);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedRoom, fetchMessages]);
};