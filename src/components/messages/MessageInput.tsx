import { useState, useRef, useCallback } from "react";
import { Paperclip, Smile, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MessageInputProps {
  onSendMessage: (message: string, files: File[], replyToMessageId?: string) => Promise<void>;
  replyingTo?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({ onSendMessage, replyingTo, onCancelReply }: MessageInputProps) {
  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common emojis for quick access
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '🔥', '💯', '🎉', '👀', '😍', '🤔', '😢', '😡', '🙏', '💪', '✅', '❌', '⭐', '🚀', '💡'];

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Files selected:', files.length, files.map(f => f.name));
    setSelectedFiles(files);
  };

  // Send a message
  const sendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

    await onSendMessage(messageInput, selectedFiles, replyingTo?.id);
    
    // Clear the input and files
    setMessageInput("");
    setSelectedFiles([]);
    onCancelReply?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Insert emoji into message
  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    
    // Reset height to auto to shrink if needed
    e.target.style.height = 'auto';
    // Set height to scroll height to expand as needed
    e.target.style.height = e.target.scrollHeight + 'px';
  }, []);

  return (
    <div 
      className={`p-4 border-t border-gray-200 bg-white flex-shrink-0 ${isDragOver ? 'bg-blue-50 border-blue-300' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Replying to {replyingTo.sender}
            </span>
            <button
              onClick={onCancelReply}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 truncate">
            {replyingTo.text}
          </p>
        </div>
      )}

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
      
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            placeholder="Send a message..."
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none pr-2"
            rows={1}
          />
        </div>
        <div className="flex items-center space-x-1">
          {/* File Attachment Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 text-gray-400" />
          </Button>
          
          {/* Emoji Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
          
          {/* Send Button */}
          <Button size="sm" className="h-8 w-8 p-0" onClick={sendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,.heic,.heif"
      />
    </div>
  );
}