import { useEffect, useRef, useCallback } from "react";
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Simplified scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll
      scrollToBottom();
      
      // Additional scroll after a short delay to handle any async rendering
      const timeoutId = setTimeout(scrollToBottom, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, scrollToBottom]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={scrollContainerRef} 
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ scrollBehavior: 'smooth' }}
    >
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