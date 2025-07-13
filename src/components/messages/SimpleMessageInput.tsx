import { useState, useRef } from "react";
import { Paperclip, Smile, Send, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SimpleMessageInputProps {
  onSendMessage: (message: string, files: File[]) => Promise<void>;
}

export function SimpleMessageInput({ onSendMessage }: SimpleMessageInputProps) {
  const [messageInput, setMessageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common emojis for quick access
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '🔥', '💯', '🎉', '👀', '😍', '🤔', '😢', '😡', '🙏', '💪', '✅', '❌', '⭐', '🚀', '💡'];

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Send a message
  const sendMessage = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

    await onSendMessage(messageInput, selectedFiles);
    
    // Clear the input and files
    setMessageInput("");
    setSelectedFiles([]);
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

  return (
    <div 
      className={`p-4 border-t bg-background h-[90px] flex-shrink-0 ${isDragOver ? 'bg-accent' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Show selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">Files to send:</div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-background p-2 rounded">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
          />
        </div>
        
        <div className="flex items-center space-x-1">
          {/* File Attachment Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 w-10 p-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          {/* Emoji Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" side="top">
              <div className="grid grid-cols-10 gap-1">
                {commonEmojis.map((emoji, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg hover:bg-accent"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Send Button */}
          <Button 
            size="sm" 
            className="h-10 w-10 p-0" 
            onClick={sendMessage}
            disabled={!messageInput.trim() && selectedFiles.length === 0}
          >
            <Send className="h-5 w-5" />
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