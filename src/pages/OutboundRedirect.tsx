import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, AlertTriangle } from "lucide-react";

export default function OutboundRedirect() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  
  const encodedUrl = searchParams.get("u");
  const targetUrl = encodedUrl ? decodeURIComponent(encodedUrl) : null;
  
  // Validate URL - must be http or https
  const isValidUrl = targetUrl && /^https?:\/\//i.test(targetUrl);
  
  useEffect(() => {
    if (!isValidUrl) {
      console.warn("[OutboundRedirect] Invalid or missing URL:", targetUrl);
      return;
    }
    
    console.log("[OutboundRedirect] Attempting redirect to:", targetUrl);
    
    // Detach opener relationship
    try {
      window.opener = null;
    } catch (e) {
      console.warn("[OutboundRedirect] Could not null opener:", e);
    }
    
    // Attempt immediate redirect
    const redirectTimer = setTimeout(() => {
      try {
        window.location.replace(targetUrl);
      } catch (e) {
        console.error("[OutboundRedirect] location.replace failed:", e);
        setRedirectFailed(true);
      }
    }, 50); // Small delay to ensure page renders first
    
    // If still on this page after 2 seconds, show fallback UI
    const fallbackTimer = setTimeout(() => {
      setRedirectFailed(true);
    }, 2000);
    
    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(fallbackTimer);
    };
  }, [targetUrl, isValidUrl]);
  
  const handleCopy = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[OutboundRedirect] Copy failed:", e);
    }
  };
  
  if (!isValidUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Invalid Link</h1>
          <p className="text-muted-foreground">
            The link you're trying to open is not valid or is missing.
          </p>
          <Button variant="outline" onClick={() => window.close()}>
            Close Tab
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-lg">
        {!redirectFailed ? (
          <>
            <div className="animate-pulse">
              <ExternalLink className="h-12 w-12 text-primary mx-auto" />
            </div>
            <h1 className="text-xl font-semibold">Opening link...</h1>
            <p className="text-muted-foreground text-sm break-all">
              {targetUrl}
            </p>
          </>
        ) : (
          <>
            <ExternalLink className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Ready to continue</h1>
            <p className="text-muted-foreground text-sm break-all">
              {targetUrl}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <a href={targetUrl} rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continue to site
                </a>
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy link
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
