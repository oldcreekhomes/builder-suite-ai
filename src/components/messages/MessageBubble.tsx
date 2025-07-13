import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Check, X, Reply } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileAttachment } from "./FileAttachment";
import type { ChatMessage } from "@/hooks/useMessages";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string, messageText: string, senderName: string) => void;
}

export function MessageBubble({ message, isCurrentUser, onEdit, onDelete, onReply }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_text || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (name: string) => {
    return name || 'Unknown User';
  };

  const handleEditSave = () => {
    if (onEdit && editText.trim()) {
      onEdit(message.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setEditText(message.message_text || "");
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowDeleteDialog(false);
  };

  const handleReply = () => {
    if (onReply && message.message_text) {
      const senderName = getDisplayName(message.sender_name);
      onReply(message.id, message.message_text, senderName);
    }
  };

  return (
    <div className={`flex items-start space-x-3 group ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.sender_avatar || ""} />
        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
          {message.sender_name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span className="font-medium text-sm text-gray-900">
            {getDisplayName(message.sender_name)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          
          {/* Actions Menu */}
          {(message.message_text || (message.file_urls && message.file_urls.length > 0)) && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={handleReply}>
                     <Reply className="h-3 w-3 mr-2" />
                     Reply
                   </DropdownMenuItem>
                   {isCurrentUser && message.message_text && (
                     <DropdownMenuItem onClick={() => setIsEditing(true)}>
                       <Edit2 className="h-3 w-3 mr-2" />
                       Edit
                     </DropdownMenuItem>
                   )}
                   {isCurrentUser && (
                     <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                       <Trash2 className="h-3 w-3 mr-2" />
                       Delete
                     </DropdownMenuItem>
                   )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* Text Message */}
        {message.message_text && (
          <div className={`rounded-lg px-3 py-2 inline-block max-w-xs mb-2 ${
            isCurrentUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            {/* TODO: Implement replied message context if needed */}

            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm bg-white text-gray-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEditSave();
                    } else if (e.key === 'Escape') {
                      handleEditCancel();
                    }
                  }}
                  autoFocus
                />
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost" onClick={handleEditSave} className="h-6 w-6 p-0">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{message.message_text}</p>
            )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}