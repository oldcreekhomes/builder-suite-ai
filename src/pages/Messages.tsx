import { useState } from "react";
import { Search, Paperclip, Smile, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const mockUsers = [
  {
    id: "1",
    name: "Jole Ann Cortes",
    role: "Virtual Assistant & Data Entry",
    lastMessage: "Jole Ann: I cant seem to co...",
    timestamp: "8:16 AM",
    avatar: "",
    hasUnread: true,
    isOnline: true,
  },
  {
    id: "2", 
    name: "Amara Miloudi",
    role: "Python Developer To...",
    lastMessage: "Amara: Please hit me...",
    timestamp: "Yesterday",
    avatar: "",
    hasUnread: true,
    unreadCount: 2,
    isOnline: false,
  },
  {
    id: "3",
    name: "Joelex Cortes", 
    role: "Accounting - Temporary ...",
    lastMessage: "Joelex: No worries, Matt 🙂",
    timestamp: "Friday",
    avatar: "",
    hasUnread: false,
    isOnline: false,
  },
];

const mockMessages = [
  {
    id: "1",
    senderId: "2",
    senderName: "Matt Gray",
    message: "Hi Jole... how are you feeling?",
    timestamp: "11:04 AM",
    avatar: "",
  },
  {
    id: "2", 
    senderId: "1",
    senderName: "Jole Ann Sorensen",
    message: "No worries. Thanks for letting me know.",
    timestamp: "11:04 AM",
    avatar: "",
  },
  {
    id: "3",
    senderId: "1", 
    senderName: "Jole Ann Sorensen",
    message: "In pain lol😭",
    timestamp: "11:26 AM",
    avatar: "",
  },
  {
    id: "4",
    senderId: "2",
    senderName: "Matt Gray", 
    message: "ughhh.... I feel so bad for you. Did they tell you when you will have the baby?",
    timestamp: "11:52 AM",
    avatar: "",
  },
  {
    id: "5",
    senderId: "1",
    senderName: "Jole Ann Sorensen",
    message: "I think today afternoon",
    timestamp: "12:37 PM", 
    avatar: "",
  },
  {
    id: "6",
    senderId: "2",
    senderName: "Matt Gray",
    message: "Goooood luck!!!",
    timestamp: "12:37 PM",
    avatar: "",
  },
];

export default function Messages() {
  const [selectedUser, setSelectedUser] = useState(mockUsers[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - User List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                selectedUser.id === user.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-600">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                  {user.hasUnread && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                    <span className="text-xs text-gray-500">{user.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.role}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600 truncate">{user.lastMessage}</p>
                    {user.unreadCount && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {user.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedUser.avatar} />
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {getInitials(selectedUser.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-gray-900">{selectedUser.name}</h2>
              <p className="text-sm text-gray-500">{selectedUser.role}</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mockMessages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.avatar} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                  {getInitials(message.senderName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{message.senderName}</span>
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                </div>
                <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-xs">
                  <p className="text-sm text-gray-900">{message.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Send a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </div>
            <Button size="sm" className="h-8 w-8 p-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}