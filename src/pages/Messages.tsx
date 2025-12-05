import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSimpleChat } from "@/hooks/useSimpleChat";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { SimpleMessagesList } from "@/components/messages/SimpleMessagesList";
import { SimpleMessageInput } from "@/components/messages/SimpleMessageInput";

export default function Messages() {
  const location = useLocation();
  const {
    selectedRoom,
    setSelectedRoom,
    messages,
    currentUserId,
    isLoadingMessages,
    startChatWithEmployee,
    sendMessage
  } = useSimpleChat();

  // Debug logging
  console.log('Messages Component Debug:', {
    pathname: location.pathname,
    selectedRoom: selectedRoom ? 'has room' : 'no room',
    messagesCount: messages.length,
    currentUserId: currentUserId ? 'has user' : 'no user',
    isLoadingMessages
  });

  // Handle navigation state from direct room navigation
  useEffect(() => {
    const navigationState = location.state as { selectedRoom?: any } | null;
    if (navigationState?.selectedRoom && !selectedRoom) {
      setSelectedRoom(navigationState.selectedRoom);
      // Automatically start chat and load messages
      startChatWithEmployee(navigationState.selectedRoom);
    }
  }, [location.state, selectedRoom, setSelectedRoom, startChatWithEmployee]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar 
          selectedUser={selectedRoom}
          onUserSelect={setSelectedRoom}
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
                     <SimpleMessagesList 
                       messages={messages} 
                       currentUserId={currentUserId} 
                       isLoadingMessages={isLoadingMessages}
                     />
                     <SimpleMessageInput 
                       onSendMessage={sendMessage}
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