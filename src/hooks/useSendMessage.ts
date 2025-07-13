import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './useMessages';

interface ChatRoom {
  id: string;
  name?: string;
  is_direct_message: boolean;
  updated_at: string;
}

export const useSendMessage = () => {
  const { toast } = useToast();

  // Send message
  const sendMessage = async (
    messageText: string, 
    selectedRoom: ChatRoom | null,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    files: File[] = []
  ) => {
    console.log('Sending message:', messageText);
    
    if (!messageText.trim() && files.length === 0) return;
    if (!selectedRoom) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Upload files if any
      let fileUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${Date.now()}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file);
          
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileName);
          
          fileUrls.push(publicUrl);
        }
      }

      // Add optimistic message immediately
      const optimisticMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        message_text: messageText.trim(),
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        created_at: new Date().toISOString(),
        sender_id: currentUser.user.id,
        sender_name: 'You',
        sender_avatar: null
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert message to database
      const { error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageText.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null
        });

      if (error) {
        console.error('Error inserting message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        throw error;
      }

      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  return {
    sendMessage
  };
};