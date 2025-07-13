import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from './useCompanyUsers';

export interface ChatRoom {
  id: string;
  name?: string;
  is_direct_message: boolean;
  updated_at: string;
  otherUser?: User;
  lastMessage?: string;
  unreadCount?: number;
}

export const useChatRooms = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const { toast } = useToast();

  // Start chat with user
  const startChatWithUser = async (user: User) => {
    try {
      console.log('Starting chat with user:', user.id);
      
      const { data: roomId, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: user.id
      });

      if (error) throw error;

      console.log('Room created/found:', roomId);

      const newRoom: ChatRoom = {
        id: roomId,
        is_direct_message: true,
        updated_at: new Date().toISOString(),
        otherUser: user
      };

      setSelectedRoom(newRoom);
      return roomId;
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive"
      });
      return null;
    }
  };

  // Mark room as read
  const markRoomAsRead = async (roomId: string) => {
    try {
      await supabase.rpc('mark_room_as_read', {
        room_id_param: roomId
      });
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  return {
    rooms,
    selectedRoom,
    setSelectedRoom,
    startChatWithUser,
    markRoomAsRead
  };
};