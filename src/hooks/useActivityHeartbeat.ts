import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Records "last active" once a minute while the tab is visible and the user interacted in the last 5 minutes. */
export function useActivityHeartbeat() {
  useEffect(() => {
    let lastInteraction = Date.now();
    const mark = () => { lastInteraction = Date.now(); };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInteraction > 5 * 60 * 1000) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      await supabase.rpc("touch_last_active" as any);
    };
    beat();
    const id = window.setInterval(beat, 60 * 1000);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);
}
