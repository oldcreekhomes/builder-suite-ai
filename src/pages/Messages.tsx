import { useState, useEffect, useRef } from "react";
import { Search, Paperclip, Smile, Send, Download, FileText, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  email: string;
}

interface ChatRoom {
  id: string;
  name: string | null;
  is_direct_message: boolean;
  updated_at: string;
  otherUser?: Employee;
  lastMessage?: string;
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  message_text: string | null;
  file_urls: string[] | null;
  created_at: string;
  sender: Employee;
}

export default function Messages() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Common emojis for quick access
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '🔥', '💯', '🎉', '👀', '😍', '🤔', '😢', '😡', '🙏', '💪', '✅', '❌', '⭐', '🚀', '💡'];

  // Fetch employees for search
  const fetchEmployees = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, role, avatar_url, email')
        .eq('home_builder_id', currentUser.user.id)
        .eq('confirmed', true); // Only show confirmed employees

      if (error) throw error;
      console.log('Found employees:', data);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    }
  };

  // Fetch existing chat rooms
  const fetchChatRooms = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data: participants, error } = await supabase
        .from('employee_chat_participants')
        .select(`
          room_id,
          employee_chat_rooms (
            id,
            name,
            is_direct_message,
            updated_at
          )
        `)
        .eq('user_id', currentUser.user.id);

      if (error) throw error;

      const rooms = participants?.map(p => p.employee_chat_rooms).filter(Boolean) || [];
      
      // For each room, get the other participant if it's a DM
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room: any) => {
          if (room.is_direct_message) {
            // Get the other participant ID
            const { data: otherParticipant } = await supabase
              .from('employee_chat_participants')
              .select('user_id')
              .eq('room_id', room.id)
              .neq('user_id', currentUser.user.id)
              .single();

            if (otherParticipant) {
              // Try to find the user in profiles first (home builders)
              let { data: userProfile } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role, avatar_url, email')
                .eq('id', otherParticipant.user_id)
                .single();

              // If not found in profiles, try employees table
              if (!userProfile) {
                const { data: employeeProfile } = await supabase
                  .from('employees')
                  .select('id, first_name, last_name, role, avatar_url, email')
                  .eq('id', otherParticipant.user_id)
                  .single();
                userProfile = employeeProfile;
              }

              return {
                ...room,
                otherUser: userProfile || null
              };
            }
          }
          return room;
        })
      );

      setChatRooms(roomsWithDetails);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  // Start a new chat with an employee
  const startChatWithEmployee = async (employee: Employee) => {
    try {
      console.log('Starting chat with employee:', employee);
      
      const { data, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: employee.id
      });

      console.log('get_or_create_dm_room result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Fetch the room details
      const { data: room, error: roomError } = await supabase
        .from('employee_chat_rooms')
        .select('*')
        .eq('id', data)
        .single();

      console.log('Room fetch result:', { room, roomError });

      if (roomError) {
        console.error('Room fetch error:', roomError);
        throw roomError;
      }

      const newRoom = {
        ...room,
        otherUser: employee
      };

      setSelectedRoom(newRoom);
      
      // Add to rooms list if not already there
      if (!chatRooms.find(r => r.id === data)) {
        setChatRooms(prev => [newRoom, ...prev]);
      }

      await fetchMessages(data);
      
      console.log('Chat started successfully');
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  // Fetch messages for a room
  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee_chat_messages')
        .select(`
          id,
          message_text,
          file_urls,
          created_at,
          sender_id
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // For each message, get the sender details from either profiles or employees table
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (message: any) => {
          // Try to find sender in profiles first (home builders)
          let { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, role, avatar_url, email')
            .eq('id', message.sender_id)
            .single();

          // If not found in profiles, try employees table
          if (!senderProfile) {
            const { data: employeeSender } = await supabase
              .from('employees')
              .select('id, first_name, last_name, role, avatar_url, email')
              .eq('id', message.sender_id)
              .single();
            senderProfile = employeeSender;
          }

          return {
            ...message,
            sender: senderProfile || { id: message.sender_id, first_name: 'Unknown', last_name: 'User', role: '', avatar_url: '', email: '' }
          };
        })
      );

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  // Send a message
  const sendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;
    if (!selectedRoom) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      let fileUrls: string[] = [];
      
      // Upload files if any are selected
      if (selectedFiles.length > 0) {
        fileUrls = await uploadFiles(selectedFiles);
      }

      const { error } = await supabase
        .from('employee_chat_messages')
        .insert({
          room_id: selectedRoom.id,
          sender_id: currentUser.user.id,
          message_text: messageInput.trim() || null,
          file_urls: fileUrls.length > 0 ? fileUrls : null
        });

      if (error) throw error;

      // Clear the input and files
      setMessageInput("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh messages
      await fetchMessages(selectedRoom.id);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Insert emoji into message
  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchChatRooms()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (employee: Employee) => {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  };

  // Filter employees and rooms based on search
  const filteredEmployees = employees.filter(employee => {
    const name = getDisplayName(employee);
    const role = employee.role || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredRooms = chatRooms.filter(room => {
    if (room.is_direct_message && room.otherUser) {
      const name = getDisplayName(room.otherUser);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return room.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
  });

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
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Existing Chat Rooms */}
              {filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                    selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={room.otherUser?.avatar_url || ""} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {room.otherUser 
                            ? getInitials(room.otherUser.first_name, room.otherUser.last_name)
                            : 'GC'
                          }
                        </AvatarFallback>
                      </Avatar>
                      {room.unreadCount && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {room.otherUser ? getDisplayName(room.otherUser) : room.name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(room.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {room.otherUser?.role || 'Group Chat'}
                      </p>
                      {room.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">{room.lastMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Available Employees */}
              {searchQuery && (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <h3 className="text-sm font-medium text-gray-700">Start new chat with:</h3>
                  </div>
                  {filteredEmployees
                    .filter(emp => !filteredRooms.some(room => room.otherUser?.id === emp.id))
                    .map((employee) => (
                    <div
                      key={employee.id}
                      onClick={() => startChatWithEmployee(employee)}
                      className="p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar_url || ""} />
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {getDisplayName(employee)}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">{employee.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {!loading && filteredRooms.length === 0 && !searchQuery && (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet. Search for employees to start chatting!
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRoom.otherUser?.avatar_url || ""} />
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {selectedRoom.otherUser 
                      ? getInitials(selectedRoom.otherUser.first_name, selectedRoom.otherUser.last_name)
                      : 'GC'
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedRoom.otherUser ? getDisplayName(selectedRoom.otherUser) : selectedRoom.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedRoom.otherUser?.role || 'Group Chat'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.avatar_url || ""} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      {getInitials(message.sender.first_name, message.sender.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {getDisplayName(message.sender)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    {/* Text Message */}
                    {message.message_text && (
                      <div className="bg-gray-100 rounded-lg px-3 py-2 inline-block max-w-xs mb-2">
                        <p className="text-sm text-gray-900">{message.message_text}</p>
                      </div>
                    )}
                    
                    {/* File Attachments */}
                    {message.file_urls && message.file_urls.length > 0 && (
                      <div className="space-y-2 max-w-xs">
                        {message.file_urls.map((fileUrl, index) => {
                          const fileName = fileUrl.split('/').pop() || 'file';
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                          
                          return (
                            <div key={index} className="border rounded-lg p-2 bg-white">
                              {isImage ? (
                                <div className="space-y-2">
                                  <img 
                                    src={fileUrl} 
                                    alt={fileName}
                                    className="max-w-full h-auto rounded cursor-pointer"
                                    onClick={() => window.open(fileUrl, '_blank')}
                                  />
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <ImageIcon className="h-3 w-3" />
                                      <span>{fileName}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium truncate">{fileName}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => window.open(fileUrl, '_blank')}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Message Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Show selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Selected files:</div>
                  <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-red-500"
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          ❌
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Send a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    {/* File Attachment Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 text-gray-400" />
                    </Button>
                    
                    {/* Emoji Button */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Smile className="h-4 w-4 text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" side="top">
                        <div className="grid grid-cols-10 gap-1">
                          {commonEmojis.map((emoji, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                              onClick={() => insertEmoji(emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button size="sm" className="h-8 w-8 p-0" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
  );
}