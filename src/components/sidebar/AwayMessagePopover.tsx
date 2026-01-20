
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface AwayMessagePopoverProps {
  currentMessage: string;
}

export function AwayMessagePopover({ currentMessage }: AwayMessagePopoverProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(currentMessage);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ away_message: message })
        .eq('id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Away message updated",
        description: "Your away message has been saved.",
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating away message:', error);
      toast({
        title: "Error",
        description: "Failed to update away message.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMessage(currentMessage);
            setOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
          <span>Edit message...</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80" 
        align="start" 
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Away Message</h4>
            <p className="text-xs text-muted-foreground">
              This message will be sent automatically when someone messages you.
            </p>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I'm currently away and will respond when I return."
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {message.length}/500
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
