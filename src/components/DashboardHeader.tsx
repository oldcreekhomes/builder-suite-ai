
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DashboardHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-gray-600 hover:text-black" />
          <div>
            <h1 className="text-2xl font-bold text-black">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your project overview.</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
            <Bell className="h-4 w-4" />
          </Button>
          <Button className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>
    </header>
  );
}
