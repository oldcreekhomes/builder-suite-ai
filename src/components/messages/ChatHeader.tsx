import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatRoom } from "@/hooks/useSimpleChat";

interface ChatHeaderProps {
  selectedRoom: ChatRoom;
}

export function ChatHeader({ selectedRoom }: ChatHeaderProps) {
  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (employee: any) => {
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
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
        </div>
      </div>
    </div>
  );
}