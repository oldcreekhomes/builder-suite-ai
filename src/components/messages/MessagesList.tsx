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

  // Enhanced scroll to bottom function
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto', force = false) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      const doScroll = () => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior
        });
      };
      
      // Immediate scroll
      doScroll();
      
      // Additional delayed scrolls to handle async content loading
      if (force) {
        [100, 300, 600, 1000].forEach((delay) => {
          scrollTimeoutRef.current = setTimeout(doScroll, delay);
        });
      }
    }
  }, []);

  // Scroll to bottom when messages change - especially important for room switches
  useEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLength.current;
    
    // If messages changed (new room loaded or new messages)
    if (currentLength !== previousLength) {
      if (currentLength > 0) {
        // For room switches (when going from 0 to N messages or significant change)
        const isRoomSwitch = previousLength === 0 && currentLength > 0;
        
        if (isRoomSwitch) {
          // Force immediate scroll to bottom for room switches
          scrollToBottom('auto', true);
        } else {
          // Smooth scroll for new messages
          scrollToBottom('smooth');
        }
      }
    }
    
    previousMessagesLength.current = currentLength;
  }, [messages, scrollToBottom]);

  // Force scroll on mount and when container becomes available
  useEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      // Multiple immediate attempts to ensure scroll happens
      scrollToBottom('auto', true);
    }
  }, [messages.length, scrollToBottom]);

  // Add intersection observer to detect when images/files are loaded
  useEffect(() => {
    if (messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Wait a bit for initial render, then scroll
    const initialScrollTimeout = setTimeout(() => {
      scrollToBottom('auto', true);
    }, 50);

    // Also scroll after a longer delay to catch any slow-loading content
    const finalScrollTimeout = setTimeout(() => {
      scrollToBottom('auto');
    }, 1500);

    return () => {
      clearTimeout(initialScrollTimeout);
      clearTimeout(finalScrollTimeout);
    };
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