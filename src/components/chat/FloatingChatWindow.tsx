import { useState, useCallback, useEffect } from 'react';
import { X, Minus, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleMessagesList } from '@/components/messages/SimpleMessagesList';
import { SimpleMessageInput } from '@/components/messages/SimpleMessageInput';
import { useMessages } from '@/hooks/useMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/hooks/useCompanyUsers';

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

  // Set up real-time subscription
  useRealtime(user, addMessage);

  // Initialize chat when opened - use useEffect with stable dependencies
  useEffect(() => {
    const initializeChat = async () => {
      console.log('FloatingChatWindow: initializeChat called', { hasInitialized, isMinimized, userId: user.id });
      if (!hasInitialized && !isMinimized) {
        console.log('FloatingChatWindow: Fetching messages for user:', user.id);
        try {
          await fetchMessages(user.id, true);
          console.log('FloatingChatWindow: Messages fetched successfully');
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
        className="fixed bottom-4 w-64 h-12 shadow-lg border bg-background cursor-pointer hover:shadow-xl transition-shadow"
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
      className="fixed bottom-4 w-80 h-96 shadow-lg border bg-background flex flex-col"
      style={{ right: `${position.right}px` }}
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
      <div className="flex-1">
        <ScrollArea className="h-full">
          <SimpleMessagesList 
            messages={messages}
            currentUserId={currentUser?.id || null}
            isLoadingMessages={isLoadingMessages}
          />
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t">
        <SimpleMessageInput onSendMessage={sendMessage} />
      </div>
    </Card>
  );
}