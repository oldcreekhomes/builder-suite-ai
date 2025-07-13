import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from './useCompanyUsers';

export const useChatRooms = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Start chat with user (simplified - just select the user)
  const startChatWithUser = async (user: User) => {
    try {
      console.log('Starting chat with user:', user.id);
      setSelectedUser(user);
      return user.id; // Return user ID instead of room ID
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

  // Mark conversation as read
  const markConversationAsRead = async (otherUserId: string) => {
    try {
      await supabase.rpc('mark_conversation_as_read', {
        other_user_id_param: otherUserId
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    selectedUser,
    setSelectedUser,
    startChatWithUser,
    markConversationAsRead
  };
};