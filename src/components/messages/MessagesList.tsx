import { useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChat";

interface MessagesListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  isLoadingMessages?: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  onLoadMoreMessages?: () => Promise<void>;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (messageId: string, messageText: string, senderName: string) => void;
}

export function MessagesList({ 
  messages, 
  currentUserId, 
  isLoadingMessages, 
  isLoadingMore, 
  hasMoreMessages, 
  onLoadMoreMessages, 
  onEditMessage, 
  onDeleteMessage, 
  onReplyToMessage 
}: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLength = useRef(messages.length);
  const isLoadingMoreRef = useRef(false);
  const scrollPositionRef = useRef(0);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'instant',
            block: 'end'
          });
        }
      });
    }
  }, []);

  // Handle scroll event for infinite loading
  const handleScroll = useCallback(async () => {
    if (!scrollContainerRef.current || !onLoadMoreMessages || isLoadingMoreRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const { scrollTop } = container;

    // If scrolled to near the top (within 100px) and we have more messages to load
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      console.log('Loading more messages...');
      isLoadingMoreRef.current = true;
      
      // Store current scroll height to maintain position after loading
      const oldScrollHeight = container.scrollHeight;
      
      try {
        await onLoadMoreMessages();
        
        // After loading, adjust scroll position to maintain the view
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - oldScrollHeight;
            container.scrollTop = scrollTop + scrollDiff;
          }
          isLoadingMoreRef.current = false;
        });
      } catch (error) {
        console.error('Error loading more messages:', error);
        isLoadingMoreRef.current = false;
      }
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMoreMessages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLength.current;
    
    // Always scroll to bottom when messages change, except when loading more historical messages
    if (currentLength > 0 && !isLoadingMore) {
      if (previousLength === 0) {
        // Initial load - always scroll to bottom
        console.log("MessagesList - Initial load, scrolling to bottom");
        setTimeout(() => scrollToBottom(), 150);
      } else if (currentLength !== previousLength) {
        // Messages changed (new messages or refresh) - scroll to bottom
        console.log("MessagesList - Messages changed, scrolling to bottom");
        setTimeout(() => scrollToBottom(), 150);
      }
    }
    
    previousMessagesLength.current = currentLength;
  }, [messages, isLoadingMore, scrollToBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading messages...</span>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef} 
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {/* Load More Button */}
      {hasMoreMessages && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMoreMessages}
            disabled={isLoadingMore}
            className="text-xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Loading more...
              </>
            ) : (
              'Load more messages'
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
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

      {messages.length === 0 && !isLoadingMessages && (
        <div className="text-center text-gray-500 py-8">
          No messages yet. Start the conversation!
        </div>
      )}

      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
}