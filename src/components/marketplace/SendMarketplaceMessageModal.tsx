import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, ArrowLeft, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface MarketplaceCompany {
  id: string;
  company_name: string;
  rating?: number;
  review_count?: number;
  message_count?: number;
}

interface SendMarketplaceMessageModalProps {
  company: MarketplaceCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendMarketplaceMessageModal({ 
  company, 
  open, 
  onOpenChange 
}: SendMarketplaceMessageModalProps) {
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [responseMethod, setResponseMethod] = useState<"email" | "phone">("email");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-marketplace-message', {
        body: {
          marketplaceCompanyId: company?.id,
          senderName,
          senderEmail: responseMethod === 'email' ? senderEmail : undefined,
          senderPhone: responseMethod === 'phone' ? senderPhone : undefined,
          message,
          responseMethod
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${company?.company_name}.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setMessage("");
    setSenderName("");
    setSenderEmail("");
    setSenderPhone("");
    setResponseMethod("email");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    if (!senderName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (responseMethod === 'email' && !senderEmail.trim()) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    if (responseMethod === 'phone' && !senderPhone.trim()) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }
    
    sendMessageMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-3 pb-2 border-b">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="text-base font-medium">
                Send request to {company.company_name}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Send a message to {company.company_name}
          </DialogDescription>
        </DialogHeader>

        {/* Company Info */}
        <div className="px-3 py-2 border-b bg-muted/30">
          <h3 className="font-semibold text-foreground">{company.company_name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {company.rating && (
              <>
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                <span>{company.rating}</span>
                {company.review_count && (
                  <span>({company.review_count})</span>
                )}
                <span className="mx-1">·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Contacted by {company.message_count || 0} people
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Message */}
          <div className="space-y-1">
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              placeholder="Give details like what you need done and how soon you need it"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 600))}
              className="min-h-[80px] resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/600
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value.slice(0, 50))}
            />
            <div className="text-xs text-muted-foreground text-right">
              {senderName.length}/50
            </div>
          </div>

          {/* Response Method */}
          <div className="space-y-1">
            <Label>How would you like to hear back?</Label>
            <RadioGroup 
              value={responseMethod} 
              onValueChange={(v) => setResponseMethod(v as "email" | "phone")}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone-option" />
                <Label htmlFor="phone-option" className="font-normal cursor-pointer">
                  SMS or phone call
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email-option" />
                <Label htmlFor="email-option" className="font-normal cursor-pointer">
                  Email
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Input */}
          {responseMethod === 'email' ? (
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
