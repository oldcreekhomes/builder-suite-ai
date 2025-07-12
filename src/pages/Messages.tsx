import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useChat } from "@/hooks/useChat";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";

export default function Messages() {
  const location = useLocation();
  const {
    selectedRoom,
    setSelectedRoom,
    messages,
    currentUserId,
    startChatWithEmployee,
    sendMessage,
    editMessage,
    deleteMessage
  } = useChat();

  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string } | null>(null);

  // Handle navigation state from direct room navigation
  useEffect(() => {
    const navigationState = location.state as { selectedRoom?: any } | null;
    if (navigationState?.selectedRoom && !selectedRoom) {
      setSelectedRoom(navigationState.selectedRoom);
    }
  }, [location.state, selectedRoom, setSelectedRoom]);

  const handleReplyToMessage = (messageId: string, messageText: string, senderName: string) => {
    setReplyingTo({ id: messageId, text: messageText, sender: senderName });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          selectedRoom={selectedRoom}
          onRoomSelect={setSelectedRoom}
          onStartChat={startChatWithEmployee}
        />
        <div className="flex-1 flex flex-col">
          <DashboardHeader title="Messages" />
          
          <div className="flex-1 flex bg-background">
            {/* Right Side - Chat Interface */}
            <div className="flex-1 flex flex-col bg-white min-h-0 border-l border-gray-200">
              {selectedRoom ? (
                <>
                  <ChatHeader selectedRoom={selectedRoom} />
                  <div className="flex-1 flex flex-col min-h-0">
                    <MessagesList 
                      messages={messages} 
                      currentUserId={currentUserId} 
                      onEditMessage={editMessage}
                      onDeleteMessage={deleteMessage}
                      onReplyToMessage={handleReplyToMessage}
                    />
                    <MessageInput 
                      onSendMessage={sendMessage}
                      replyingTo={replyingTo}
                      onCancelReply={handleCancelReply}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose from existing chats or search for employees to start a new conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}