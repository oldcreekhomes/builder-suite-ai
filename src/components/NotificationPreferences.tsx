import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useToast } from "@/hooks/use-toast";

export const NotificationPreferences = () => {
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences();
  const { isSupported, permission, requestPermission } = useBrowserNotifications();
  const { toast } = useToast();

  const handleBrowserNotificationToggle = async (checked: boolean) => {
    if (checked) {
      // Request permission first
      const result = await requestPermission();
      
      if (result === 'granted') {
        updatePreferences({ browser_notifications_enabled: true });
        toast({
          title: "Browser notifications enabled",
          description: "You'll receive notifications for new messages.",
        });
      } else if (result === 'denied') {
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      } else if (result === 'unsupported') {
        toast({
          title: "Not supported",
          description: "Your browser doesn't support notifications.",
          variant: "destructive",
        });
      }
    } else {
      updatePreferences({ browser_notifications_enabled: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Types Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="text-sm font-medium">Alert Types</h3>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="browser-notifications" className="text-sm">
              Browser notifications
            </Label>
            <Switch
              id="browser-notifications"
              checked={preferences.browser_notifications_enabled && permission === 'granted'}
              onCheckedChange={handleBrowserNotificationToggle}
              disabled={!isSupported || permission === 'denied'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
