
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, UserPlus, Settings, Building2, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProfileDialog } from "@/components/ProfileDialog";
import { AwayMessagePopover } from "@/components/sidebar/AwayMessagePopover";

export function SidebarUserDropdown() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { isOwner, isAccountant } = useUserRole();
  const { canAccessEmployees } = useEmployeePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isTogglingAway, setIsTogglingAway] = useState(false);

  // Show employees menu item if user is owner/accountant OR has permission
  const showEmployeesMenu = isOwner || isAccountant || canAccessEmployees;

  // Get away status from profile
  const isAway = profile?.is_away ?? false;
  const awayMessage = profile?.away_message ?? "I'm currently away and will respond when I return.";

  const handleToggleAway = async (checked: boolean) => {
    if (!user?.id) return;
    
    setIsTogglingAway(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_away: checked })
        .eq('id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: checked ? "Away mode enabled" : "Away mode disabled",
        description: checked 
          ? "Auto-replies will be sent when you receive messages." 
          : "You will no longer send auto-replies.",
      });
    } catch (error) {
      console.error('Error toggling away status:', error);
      toast({
        title: "Error",
        description: "Failed to update away status.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingAway(false);
    }
  };

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
      <SidebarFooter className="p-0 border-t border-gray-200 h-[72px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto mx-4 my-4">
              <div className="flex items-center space-x-3">
                {isAway && (
                  <Moon className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={profile?.avatar_url || ""} 
                    alt="User avatar"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-foreground">{getDisplayName()}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-32">
                    {user?.email}
                  </span>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover" align="end" forceMount>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => setProfileOpen(true)}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {showEmployeesMenu && (
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => navigate('/employees')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Employees</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/companies')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span>Companies</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isTogglingAway) {
                    handleToggleAway(!isAway);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <Moon className={`h-4 w-4 ${isAway ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm">Away Mode</span>
                </div>
                <Switch
                  checked={isAway}
                  onCheckedChange={handleToggleAway}
                  disabled={isTogglingAway}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {isAway && (
              <div className="px-2 pb-1">
                <AwayMessagePopover currentMessage={awayMessage} />
              </div>
            )}
            <DropdownMenuItem 
              className="cursor-pointer"
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
