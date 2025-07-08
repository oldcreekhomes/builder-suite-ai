
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, UserPlus, Settings, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileDialog } from "@/components/ProfileDialog";

export function SidebarUserDropdown() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    console.log("Logout initiated...");
    try {
      // Always clear local session and redirect, regardless of server response
      await supabase.auth.signOut();
      console.log("Logout successful, redirecting to auth page");
      // Clear any cached data and redirect
      window.location.href = "/auth";
    } catch (err) {
      console.error("Logout exception:", err);
      // Still redirect even if there's an error
      window.location.href = "/auth";
    }
  };

  // Get user initials for fallback (only used when no avatar)
  const getUserInitials = () => {
    if (profile?.first_name || profile?.last_name) {
      const first = profile.first_name?.charAt(0) || "";
      const last = profile.last_name?.charAt(0) || "";
      return (first + last).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return "Account";
  };

  return (
    <>
      <SidebarFooter className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={profile?.avatar_url || ""} 
                    alt="User avatar"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-gray-900">{getDisplayName()}</span>
                  <span className="text-xs text-gray-500 truncate max-w-32">
                    {user?.email}
                  </span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => setProfileOpen(true)}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => navigate('/employees')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Employees</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => navigate('/companies')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>Companies</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-gray-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      
      <ProfileDialog 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
      />
    </>
  );
}
