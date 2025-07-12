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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use multiple timeouts to handle async content loading
    const timeouts = [0, 100, 300, 500]; // Progressive delays
    
    timeouts.forEach((delay, index) => {
      setTimeout(() => {
        scrollToBottom(index === 0 ? 'auto' : 'smooth');
      }, delay);
    });

    // Cleanup function to clear any pending timeouts
    return () => {
      timeouts.forEach((_, index) => {
        clearTimeout(index);
      });
    };
  }, [messages]);

  // Also scroll on component mount if messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 50);
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