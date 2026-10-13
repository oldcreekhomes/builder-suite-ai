import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PENDING_KEY = "plaid_pending_link";

export type PlaidTarget = { projectId: string; accountId: string };

export async function exchangePlaidToken(
  target: PlaidTarget,
  publicToken: string,
  metadata: PlaidLinkOnSuccessMetadata,
) {
  const acct = metadata.accounts?.[0];
  if (!acct) throw new Error("No bank account selected");
  const { data, error } = await supabase.functions.invoke("plaid", {
    body: {
      action: "exchange",
      public_token: publicToken,
      plaid_account_id: acct.id,
      project_id: target.projectId,
      account_id: target.accountId,
      institution_name: metadata.institution?.name ?? undefined,
      account_mask: acct.mask ?? undefined,
      account_label: acct.name ?? undefined,
    },
  });
  if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
}

export function readPendingPlaid(): { linkToken: string; target: PlaidTarget } | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
}
export function clearPendingPlaid() {
  localStorage.removeItem(PENDING_KEY);
}

export function PlaidConnectButton({ target, connected, onConnected }: {
  target: PlaidTarget;
  connected: boolean;
  onConnected: () => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSuccess = useCallback(async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    try {
      await exchangePlaidToken(target, publicToken, metadata);
      clearPendingPlaid();
      toast.success("Bank connected");
      onConnected();
    } catch (e) {
      toast.error((e as Error).message || "Could not connect bank");
    } finally {
      setLinkToken(null);
    }
  }, [target, onConnected]);

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
      const { data, error } = await supabase.functions.invoke("plaid", { body: { action: "link_token" } });
      if (error || !(data as any)?.link_token) throw new Error((data as any)?.error || error?.message || "Plaid unavailable");
      const token = (data as any).link_token as string;
      localStorage.setItem(PENDING_KEY, JSON.stringify({ linkToken: token, target }));
      setLinkToken(token);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 shrink-0"
      onClick={start}
      disabled={loading}
      title={connected ? "Reconnect bank (live balance)" : "Connect bank for live balance"}
      aria-label="Connect bank"
    >
      <Link2 className={connected ? "h-3.5 w-3.5 text-green-600" : "h-3.5 w-3.5 text-muted-foreground"} />
    </Button>
  );
}
