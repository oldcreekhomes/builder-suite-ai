import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { clearPendingPlaid, exchangePlaidToken, readPendingPlaid } from "@/components/banking/PlaidConnectButton";

export default function PlaidOAuth() {
  const navigate = useNavigate();
  const pending = useRef(readPendingPlaid()).current;

  const { open, ready } = usePlaidLink({
    token: pending?.linkToken ?? null,
    receivedRedirectUri: window.location.href,
    onSuccess: async (publicToken, metadata) => {
      try {
        if (pending) await exchangePlaidToken(publicToken, metadata);
        toast.success("Bank connected");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        clearPendingPlaid();
        navigate("/", { replace: true });
      }
    },
    onExit: () => { clearPendingPlaid(); navigate("/", { replace: true }); },
  });

  useEffect(() => {
    if (!pending) { navigate("/", { replace: true }); return; }
    if (ready) open();
  }, [ready, open, pending, navigate]);

  return <div className="p-8 text-sm text-muted-foreground">Finishing bank connection…</div>;
}
