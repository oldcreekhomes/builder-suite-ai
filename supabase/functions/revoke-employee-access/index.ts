import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// Schedules deferred removal: user keeps access through the end of the
// current billing period (which is already paid for). Stripe quantity is
// decremented now with proration_behavior:'none' so the NEXT invoice is
// lower; no refund is issued. The cron job process-pending-removals
// performs the actual ban when pending_removal_at <= now().
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { employeeId } = await req.json();
    if (!employeeId) return json({ error: "employeeId is required" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", caller.id);
    if (!callerRoles?.some((r) => r.role === "owner")) {
      return json({ error: "Only owners can revoke access" }, 403);
    }

    if (employeeId === caller.id) return json({ error: "You cannot revoke your own access" }, 400);

    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from("users").select("home_builder_id, id, pending_removal_at, access_revoked")
      .eq("id", employeeId).single();
    if (targetErr || !targetUser) return json({ error: "Employee not found" }, 404);
    if (targetUser.home_builder_id !== caller.id) {
      return json({ error: "Employee is not in your company" }, 403);
    }

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", employeeId);
    if (targetRoles?.some((r) => r.role === "owner")) {
      return json({ error: "Cannot revoke access for an owner" }, 403);
    }

    // Determine when access ends. Default to subscription's current_period_end;
    // if there is no Stripe subscription, fall back to immediate (end-of-day).
    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, current_period_end")
      .eq("owner_id", caller.id)
      .maybeSingle();

    let endsAt: string | null = subRow?.current_period_end ?? null;

    // Fetch authoritative period_end from Stripe and update Stripe quantity.
    if (subRow?.stripe_subscription_id) {
      try {
        const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        const stripeSub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
        if (stripeSub.current_period_end) {
          endsAt = new Date(stripeSub.current_period_end * 1000).toISOString();
        }
        const item = stripeSub.items.data[0];
        const currentQty = item?.quantity ?? 1;
        const newQty = Math.max(1, currentQty - 1);
        if (item && newQty !== currentQty) {
          await stripe.subscriptions.update(subRow.stripe_subscription_id, {
            items: [{ id: item.id, quantity: newQty }],
            proration_behavior: "none",
          });
        }
        await supabaseAdmin.from("subscriptions")
          .update({ user_count: newQty }).eq("owner_id", caller.id);
      } catch (e) {
        console.error("Stripe quantity decrement failed:", e);
      }
    }

    // No subscription → revoke immediately so we don't leave free access dangling.
    if (!endsAt) endsAt = new Date().toISOString();

    const { error: updErr } = await supabaseAdmin
      .from("users")
      .update({ pending_removal_at: endsAt })
      .eq("id", employeeId);
    if (updErr) return json({ error: `Failed to schedule removal: ${updErr.message}` }, 500);

    return json({ success: true, pendingRemovalAt: endsAt });
  } catch (e) {
    console.error("revoke-employee-access error", e);
    return json({ error: (e as Error)?.message || "Unexpected error" }, 500);
  }
};

serve(handler);
