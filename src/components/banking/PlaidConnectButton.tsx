import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PENDING_KEY = "plaid_pending_link";

async function invokePlaid(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("plaid", { body });
  if (data && (data as any).error) throw new Error(String((data as any).error));
  if (error) {
    // Read the server's message instead of surfacing a raw HTTP error
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.json) msg = (await ctx.json())?.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as any;
}
export { invokePlaid };

export async function exchangePlaidToken(publicToken: string, metadata: PlaidLinkOnSuccessMetadata) {
  await invokePlaid({
    action: "exchange",
    public_token: publicToken,
    institution_name: metadata.institution?.name ?? undefined,
  });
}

export function readPendingPlaid(): { linkToken: string } | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
}
export function clearPendingPlaid() {
  localStorage.removeItem(PENDING_KEY);
}

/** One button: sign in to the bank once; every account it shares is saved. */
export function PlaidConnectButton({ connected, onConnected }: { connected: boolean; onConnected: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSuccess = useCallback(async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    try {
      await exchangePlaidToken(publicToken, metadata);
      toast.success("Bank connected");
      onConnected();
    } catch (e) {
      toast.error((e as Error).message || "Could not connect bank");
    } finally {
      clearPendingPlaid();
      setLinkToken(null);
    }
  }, [onConnected]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => { setLinkToken(null); clearPendingPlaid(); },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const start = async () => {
    setLoading(true);
    try {
      const data = await invokePlaid({ action: "link_token" });
      const token = data?.link_token as string;
      if (!token) throw new Error("Plaid unavailable");
      localStorage.setItem(PENDING_KEY, JSON.stringify({ linkToken: token }));
      setLinkToken(token);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="h-9" onClick={start} disabled={loading}>
      <Landmark className="h-4 w-4 mr-1" />
      {connected ? "Add Bank" : "Connect Bank"}
    </Button>
  );
}
