import { 
  Building2, 
  Calendar, 
  Calculator, 
  DollarSign, 
  FileText, 
  Home, 
  Users,
  LogOut,
  File,
  Image,
  ChevronDown,
  User,
  UserPlus
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ProfileDialog } from "./ProfileDialog";

const navigationItems = [
  {
    title: "Project Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Documents",
    icon: FileText,
    submenu: [
      {
        title: "Files",
        url: "/files",
        icon: File,
      },
      {
        title: "Photos",
        url: "/photos", 
        icon: Image,
      }
    ]
  },
  {
    title: "Budget",
    url: "/budget",
    icon: DollarSign,
  },
  {
    title: "Bidding",
    url: "/bidding",
    icon: FileText,
  },
  {
    title: "AI Estimating",
    url: "/estimating",
    icon: Calculator,
  },
  {
    title: "Schedules",
    url: "/schedules",
    icon: Calendar,
  },
  {
    title: "Companies",
    url: "/companies",
    icon: Users,
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
      toast({
        title: "Success",
        description: "You have been signed out successfully.",
      });
    }
  };

  // Get user initials for fallback
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

  // Get current project ID from URL
  const getProjectId = () => {
    const pathParts = location.pathname.split('/');
    return pathParts[2]; // /project/{id}
  };

  const projectId = getProjectId();

  return (
    <>
      <Sidebar className="border-r border-gray-200">
        <SidebarHeader className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-black" />
              <div>
                <h1 className="text-xl font-bold text-black">BuildCore</h1>
                <p className="text-sm text-gray-600">Construction Management</p>
              </div>
            </div>
            <SidebarTrigger className="text-gray-600 hover:text-black hover:bg-gray-100 transition-colors h-8 w-8" />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.submenu ? (
                      <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full justify-between hover:bg-gray-100 text-gray-700 hover:text-black transition-colors">
                            <div className="flex items-center space-x-3">
                              <item.icon className="h-5 w-5" />
                              <span className="font-medium">{item.title}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${documentsOpen ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <a 
                                    href={projectId ? `/project/${projectId}${subItem.url}` : subItem.url}
                                    className="flex items-center space-x-3 p-2 rounded-lg"
                                  >
                                    <subItem.icon className="h-4 w-4" />
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton 
                        asChild 
                        className="w-full justify-start hover:bg-gray-100 text-gray-700 hover:text-black transition-colors"
                      >
                        <a href={item.url} className="flex items-center space-x-3 p-3 rounded-lg">
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="p-4 border-t border-gray-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt="User avatar" />
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
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      
      <ProfileDialog 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
      />
    </>
  );
}
