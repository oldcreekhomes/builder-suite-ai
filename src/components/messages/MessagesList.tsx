import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/hooks/useChat";

interface MessagesListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (messageId: string, messageText: string, senderName: string) => void;
}

export function MessagesList({ messages, currentUserId, onEditMessage, onDeleteMessage, onReplyToMessage }: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLength = useRef(messages.length);

  // Function to scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: behavior
      });
    }
  };

  // Scroll to bottom when messages change (new messages or room switch)
  useEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLength.current;
    
    // Always scroll to bottom when room changes (messages array changes significantly)
    // or when new messages are added
    if (currentLength !== previousLength || currentLength > 0) {
      // Use immediate scroll for room changes, smooth for new messages
      const scrollBehavior = (currentLength > 0 && previousLength === 0) ? 'auto' : 'smooth';
      
      // Multiple attempts to ensure scrolling works with async content
      const scrollAttempts = [0, 50, 150, 300, 500];
      
      scrollAttempts.forEach((delay, index) => {
        setTimeout(() => {
          scrollToBottom(index === 0 ? 'auto' : scrollBehavior);
        }, delay);
      });
    }
    
    previousMessagesLength.current = currentLength;
  }, [messages]);

  // Force scroll to bottom on component mount
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll on mount
      setTimeout(() => scrollToBottom('auto'), 0);
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, []);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isCurrentUser = currentUserId === message.sender.id;
        
        return (
          <MessageBubble 
            key={message.id} 
            message={message} 
            isCurrentUser={isCurrentUser}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReply={onReplyToMessage}
          />
        );
      })}
      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No messages yet. Start the conversation!
        </div>
      )}
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
}