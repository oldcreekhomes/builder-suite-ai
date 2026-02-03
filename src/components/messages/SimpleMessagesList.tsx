import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ChatMessage } from "@/hooks/useSimpleChat";
import { FileText, File, FileSpreadsheet, FileImage, FileVideo, FileAudio, FileCode } from "lucide-react";
import { getCleanFileName } from "@/components/bidding/utils/fileIconUtils";
import { linkifyText } from "@/lib/linkify";
import { openExternal } from "@/lib/openExternal";

interface SimpleMessagesListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  isLoadingMessages: boolean;
}

export function SimpleMessagesList({ messages, currentUserId, isLoadingMessages }: SimpleMessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug logging for message changes
  useEffect(() => {
    console.log('SimpleMessagesList received messages:', {
      count: messages.length,
      isLoading: isLoadingMessages,
      messageIds: messages.map(m => m.id),
      messagePreviews: messages.map(m => ({ id: m.id, text: m.message_text?.substring(0, 50), sender: m.sender_name }))
    });
  }, [messages, isLoadingMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAvatarFallback = (sender: any) => {
    if (sender?.first_name && sender?.last_name) {
      return `${sender.first_name.charAt(0)}${sender.last_name.charAt(0)}`.toUpperCase();
    }
    return sender?.first_name?.charAt(0)?.toUpperCase() || "U";
  };

  const formatTime = (timestamp: string | undefined | null) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), "EEE M/d, h:mm a");
    } catch (e) {
      console.warn('Invalid timestamp:', timestamp);
      return '';
    }
  };

  const isMyMessage = (senderId: string) => {
    return senderId === currentUserId;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    switch (extension) {
      case 'pdf':
        return <File className="w-5 h-5 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'txt':
        return <FileText className="w-5 h-5 text-gray-600" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'heic':
      case 'heif':
        return <FileImage className="w-5 h-5 text-purple-600" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return <FileVideo className="w-5 h-5 text-orange-600" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <FileAudio className="w-5 h-5 text-pink-600" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'py':
      case 'java':
        return <FileCode className="w-5 h-5 text-yellow-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderFileAttachment = (url: string, index: number, isOwn: boolean) => {
    const fileName = url.split('/').pop() || 'file';
    const isImage = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileName);

    if (isImage) {
      return (
        <div key={index} className="mt-2">
          <img
            src={url}
            alt="Attached image"
            className="max-w-xs max-h-64 rounded-lg cursor-pointer"
            onClick={() => openExternal(url)}
          />
        </div>
      );
    } else {
      return (
        <div key={index} className="mt-2">
          <div
            title={getCleanFileName(fileName)}
            className="inline-flex items-center p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 shadow-sm"
            onClick={() => openExternal(url)}
          >
            {getFileIcon(fileName)}
          </div>
        </div>
      );
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 space-y-4">
      {messages.map((message) => {
        // Defensive check - skip invalid messages
        if (!message?.id) {
          console.warn('Skipping invalid message without ID');
          return null;
        }
        
        const isOwn = isMyMessage(message.sender_id);
        
        return (
          <div
            key={message.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 ${isOwn ? 'ml-2' : 'mr-2'}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender_avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {(message.sender_name || 'U').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Message Content */}
              <div className="text-left">
                {/* Sender name and time */}
                <div className={`text-xs text-muted-foreground mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                  <span className="font-medium">
                    {message.sender_name || 'Unknown'}
                  </span>
                  <span className="ml-2">{formatTime(message.created_at)}</span>
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-lg px-3 py-2 ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {/* Text content */}
                  {message.message_text && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {linkifyText(message.message_text)}
                    </p>
                  )}

                  {/* File attachments */}
                  {message.file_urls && [...new Set(message.file_urls)].map((url, index) => 
                    renderFileAttachment(url, index, isOwn)
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}