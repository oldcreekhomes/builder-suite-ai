import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileAttachment } from "./FileAttachment";
import type { ChatMessage } from "@/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (employee: any) => {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  };

  return (
    <div className={`flex items-start space-x-3 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.sender.avatar_url || ""} />
        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
          {getInitials(message.sender.first_name, message.sender.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
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
          <div className={`rounded-lg px-3 py-2 inline-block max-w-xs mb-2 ${
            isCurrentUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            <p className="text-sm">{message.message_text}</p>
          </div>
        )}
        
        {/* File Attachments */}
        {message.file_urls && message.file_urls.length > 0 && (
          <div className="space-y-2 max-w-xs">
            {message.file_urls.map((fileUrl, index) => (
              <FileAttachment key={index} fileUrl={fileUrl} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}