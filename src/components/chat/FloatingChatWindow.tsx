import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Minus, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleMessagesList } from '@/components/messages/SimpleMessagesList';
import { SimpleMessageInput } from '@/components/messages/SimpleMessageInput';
import { useMessages } from '@/hooks/useMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/hooks/useCompanyUsers';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface FloatingChatWindowProps {
  user: User;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  position: { right: number };
}

export function FloatingChatWindow({ 
  user, 
  onClose, 
  onMinimize, 
  isMinimized, 
  position 
}: FloatingChatWindowProps) {
  const { messages, isLoadingMessages, fetchMessages, setMessages, addMessage } = useMessages();
  const { sendMessage: sendMessageHook } = useSendMessage();
  const { user: currentUser } = useAuth();
  const [hasInitialized, setHasInitialized] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Simple realtime subscription for this conversation
  useEffect(() => {
    if (!currentUser?.id || !user.id) return;

    const channel = supabase.channel(`floating-chat-${currentUser.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_chat_messages',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Validate essential fields exist to prevent crashes
          if (!message?.id || !message?.sender_id) {
            console.warn('💬 FloatingChat: Received invalid message payload, skipping:', message);
            return;
          }
          
          if (message.sender_id === user.id) {
            // Fetch sender info to enrich the message (prevents white-out screens)
            const { data: sender } = await supabase
              .from('users')
              .select('first_name, last_name, avatar_url')
              .eq('id', message.sender_id)
              .maybeSingle();

            const enrichedMessage = {
              ...message,
              sender_name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
              sender_avatar: sender?.avatar_url || null,
              created_at: message.created_at || new Date().toISOString() // Fallback for missing timestamp
            };

            addMessage(enrichedMessage);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUser?.id, user.id, addMessage]);

  // Initialize chat when opened
  useEffect(() => {
    const initializeChat = async () => {
      if (!hasInitialized && !isMinimized) {
        try {
          await fetchMessages(user.id, true);
          setHasInitialized(true);
        } catch (error) {
          console.error('FloatingChatWindow: Error fetching messages:', error);
        }
      }
    };

    if (!isMinimized && !hasInitialized) {
      initializeChat();
    }
  }, [isMinimized, hasInitialized, user.id, fetchMessages]);

  const sendMessage = useCallback(async (messageText: string, files: File[] = []) => {
    await sendMessageHook(messageText, user, setMessages, files);
  }, [sendMessageHook, user, setMessages]);

  const getAvatarFallback = (user: User) => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  if (isMinimized) {
    return (
      <Card 
        className="fixed bottom-4 w-64 h-12 shadow-lg border bg-background cursor-pointer hover:shadow-xl transition-shadow z-[9999]"
        style={{ right: `${position.right}px` }}
        onClick={onMinimize}
      >
        <div className="flex items-center justify-between p-3 h-full">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {getAvatarFallback(user)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">
              {user.first_name} {user.last_name}
            </span>
          </div>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="fixed bottom-4 h-[500px] shadow-lg border bg-background flex flex-col z-[9999]"
      style={{ right: `${position.right}px`, width: '423px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback className="text-sm">
              {getAvatarFallback(user)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {user.first_name} {user.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMinimize}
            className="h-6 w-6 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <SimpleMessagesList 
          messages={messages}
          currentUserId={currentUser?.id || null}
          isLoadingMessages={isLoadingMessages}
        />
      </div>

      {/* Input */}
      <div className="border-t">
        <SimpleMessageInput onSendMessage={sendMessage} />
      </div>
    </Card>
  );
}
