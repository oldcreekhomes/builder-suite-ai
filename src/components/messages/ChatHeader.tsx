import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/hooks/useSimpleChat";

interface ChatHeaderProps {
  selectedRoom: User;
}

export function ChatHeader({ selectedRoom }: ChatHeaderProps) {
  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDisplayName = (user: User) => {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0 h-[90px] flex items-center">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedRoom.avatar_url || ""} />
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {getInitials(selectedRoom.first_name, selectedRoom.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-gray-900">
            {getDisplayName(selectedRoom)}
          </h2>
        </div>
      </div>
    </div>
  );
}