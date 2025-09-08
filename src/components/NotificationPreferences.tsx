import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, TestTube } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";
import { audioManager } from "@/utils/audioManager";

export const NotificationPreferences = () => {
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences();

  const handleTestNotification = async () => {
    console.log('=== Testing Notifications ===');
    console.log('Preferences:', preferences);

    // Test toast notification
    if (preferences.toast_notifications_enabled) {
      console.log('🧪 Showing test toast notification');
      toast("Test Chat Message", {
        description: "John Doe: Hey there! This is a test message.",
        duration: 5000,
      });
    } else {
      console.log('🧪 Toast notifications not enabled');
    }

    // Test sound notification using audio manager
    if (preferences.sound_notifications_enabled) {
      console.log('🧪 Playing test sound');
      const soundPlayed = await audioManager.playNotificationSound();
      if (soundPlayed) {
        console.log('🧪 Test sound played successfully');
      } else {
        console.log('🧪 Test sound failed to play');
      }
    } else {
      console.log('🧪 Sound notifications not enabled');
    }

    console.log('=== Notification test complete ===');
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
            <Label htmlFor="toast-notifications" className="text-sm">
              In-app toast notifications
            </Label>
            <Switch
              id="toast-notifications"
              checked={preferences.toast_notifications_enabled}
              onCheckedChange={(checked) => 
                updatePreferences({ toast_notifications_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sound-notifications" className="text-sm">
              Sound alerts
            </Label>
            <Switch
              id="sound-notifications"
              checked={preferences.sound_notifications_enabled}
              onCheckedChange={(checked) => 
                updatePreferences({ sound_notifications_enabled: checked })
              }
            />
          </div>
        </div>
      </div>




      {/* Test Notification */}
      <div className="pt-4 border-t">
        <Button
          onClick={handleTestNotification}
          variant="outline"
          className="w-full"
          disabled={isUpdating}
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Notifications
        </Button>
      </div>
    </div>
  );
};