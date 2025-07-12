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

  // Scroll to bottom function with instant scrolling
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant'
      });
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      console.log("MessagesList - Rendering messages:", messages.length);
      console.log("MessagesList - Last message:", messages[messages.length - 1]);
      
      // Use requestAnimationFrame to ensure DOM has updated, then scroll
      requestAnimationFrame(() => {
        scrollToBottom(false); // Instant scroll first
        
        // Then a delayed scroll to handle any lazy-loaded content
        setTimeout(() => {
          scrollToBottom(false);
          
          // Log scroll position after scrolling
          if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            console.log("MessagesList - Scroll position:", {
              scrollTop: container.scrollTop,
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight,
              isAtBottom: container.scrollTop + container.clientHeight >= container.scrollHeight - 10
            });
          }
        }, 200); // Increased delay to ensure all content is rendered
      });
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