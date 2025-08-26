import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './useMessages';
import { User } from './useCompanyUsers';

export const useSendMessage = () => {
  const { toast } = useToast();

  // Send message
  const sendMessage = async (
    messageText: string, 
    otherUser: User | null,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    files: File[] = []
  ) => {
    console.log('Sending message:', messageText);
    
    if (!messageText.trim() && files.length === 0) return;
    if (!otherUser) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Get current user's profile info for avatar
      let currentUserName = 'You';
      let currentUserAvatar = null;

      // Get current user's profile info from unified users table
      const { data: currentUserData } = await supabase
        .from('users')
        .select('first_name, last_name, avatar_url')
        .eq('id', currentUser.user.id)
        .maybeSingle();

      if (currentUserData) {
        currentUserName = `${currentUserData.first_name || ''} ${currentUserData.last_name || ''}`.trim() || 'You';
        currentUserAvatar = currentUserData.avatar_url;
      }

      // Upload files if any
      let fileUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          // Sanitize filename by removing spaces and special characters
          const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_');
          const fileName = `${Date.now()}_${Math.random()}_${sanitizedName}`;
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

      // Add optimistic message immediately with proper avatar
      const optimisticMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        message_text: messageText.trim(),
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        created_at: new Date().toISOString(),
        sender_id: currentUser.user.id,
        sender_name: currentUserName,
        sender_avatar: currentUserAvatar
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      // Insert message to database
      const { error } = await supabase
        .from('user_chat_messages')
        .insert({
          sender_id: currentUser.user.id,
          recipient_id: otherUser.id,
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