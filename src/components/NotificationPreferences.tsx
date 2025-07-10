import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Volume2, MessageSquare, Clock, TestTube } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

export const NotificationPreferences = () => {
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences();

  const handleTestNotification = () => {
    if (preferences.browser_notifications_enabled && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Test Notification", {
          body: "This is how your chat notifications will appear.",
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("Test Notification", {
              body: "This is how your chat notifications will appear.",
              icon: "/favicon.ico",
            });
          }
        });
      }
    }

    if (preferences.toast_notifications_enabled) {
      toast("Test Chat Message", {
        description: "John Doe: Hey there! This is a test message.",
        duration: preferences.toast_duration * 1000,
      });
    }
  };

  const soundOptions = [
    { value: 'chime', label: 'Chime' },
    { value: 'bell', label: 'Bell' },
    { value: 'notification', label: 'Notification' },
    { value: 'subtle', label: 'Subtle Beep' },
  ];

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
              checked={preferences.browser_notifications_enabled}
              onCheckedChange={(checked) => 
                updatePreferences({ browser_notifications_enabled: checked })
              }
            />
          </div>

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

      {/* Sound Settings */}
      {preferences.sound_notifications_enabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <h3 className="text-sm font-medium">Sound Settings</h3>
          </div>
          
          <div className="pl-6">
            <Label htmlFor="notification-sound" className="text-sm">
              Notification sound
            </Label>
            <Select
              value={preferences.notification_sound}
              onValueChange={(value) => updatePreferences({ notification_sound: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Message Type Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h3 className="text-sm font-medium">Message Types</h3>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="direct-messages" className="text-sm">
              Direct messages
            </Label>
            <Switch
              id="direct-messages"
              checked={preferences.direct_message_notifications}
              onCheckedChange={(checked) => 
                updatePreferences({ direct_message_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="group-messages" className="text-sm">
              Group messages
            </Label>
            <Switch
              id="group-messages"
              checked={preferences.group_message_notifications}
              onCheckedChange={(checked) => 
                updatePreferences({ group_message_notifications: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h3 className="text-sm font-medium">Do Not Disturb</h3>
        </div>
        
        <div className="space-y-3 pl-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dnd-start" className="text-sm">
                Start time
              </Label>
              <Input
                id="dnd-start"
                type="time"
                value={preferences.do_not_disturb_start || ''}
                onChange={(e) => 
                  updatePreferences({ do_not_disturb_start: e.target.value || undefined })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dnd-end" className="text-sm">
                End time
              </Label>
              <Input
                id="dnd-end"
                type="time"
                value={preferences.do_not_disturb_end || ''}
                onChange={(e) => 
                  updatePreferences({ do_not_disturb_end: e.target.value || undefined })
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toast Duration */}
      {preferences.toast_notifications_enabled && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm">
              Toast duration: {preferences.toast_duration} seconds
            </Label>
            <div className="mt-2 px-2">
              <Slider
                value={[preferences.toast_duration]}
                onValueChange={([value]) => updatePreferences({ toast_duration: value })}
                max={30}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

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