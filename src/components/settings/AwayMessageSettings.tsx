import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Moon } from "lucide-react";

export function AwayMessageSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAway, setIsAway] = useState(false);
  const [awayMessage, setAwayMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAwayStatus();
    }
  }, [user?.id]);

  const fetchAwayStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_away, away_message')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      setIsAway(data.is_away || false);
      setAwayMessage(data.away_message || "");
    } catch (error) {
      console.error('Error fetching away status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_away: isAway,
          away_message: awayMessage.trim() || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Away status updated",
        description: isAway 
          ? "Your away message will be sent automatically to anyone who messages you." 
          : "Away message has been turned off.",
      });
    } catch (error) {
      console.error('Error saving away status:', error);
      toast({
        title: "Error",
        description: "Failed to update away status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Away Message</CardTitle>
        </div>
        <CardDescription>
          Set up an automatic reply for when you're unavailable. Anyone who messages you will receive your away message once per 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="away-toggle" className="text-base font-medium">
              I'm Away
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable to automatically send your away message
            </p>
          </div>
          <Switch
            id="away-toggle"
            checked={isAway}
            onCheckedChange={setIsAway}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="away-message">Away Message</Label>
          <Textarea
            id="away-message"
            placeholder="I'm currently away and will respond when I return. For urgent matters, please contact..."
            value={awayMessage}
            onChange={(e) => setAwayMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This message will be prefixed with "[Auto-Reply]" when sent.
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}