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

// Restores an employee. Handles two cases:
//  1. Pending removal (pending_removal_at set, not yet revoked) → clear the
//     date and bump Stripe quantity back up.
//  2. Already revoked → lift the auth ban, clear access_revoked, bump
//     Stripe quantity.
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
      return json({ error: "Only owners can restore access" }, 403);
    }

    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from("users").select("home_builder_id, id, access_revoked, pending_removal_at")
      .eq("id", employeeId).single();
    if (targetErr || !targetUser) return json({ error: "Employee not found" }, 404);
    if (targetUser.home_builder_id !== caller.id) {
      return json({ error: "Employee is not in your company" }, 403);
    }

    const wasRevoked = !!targetUser.access_revoked;
    const wasPending = !!targetUser.pending_removal_at && !targetUser.access_revoked;

    if (wasRevoked) {
      const { error: unbanErr } = await supabaseAdmin.auth.admin.updateUserById(employeeId, {
        ban_duration: "none",
      });
      if (unbanErr) return json({ error: `Failed to lift ban: ${unbanErr.message}` }, 500);
    }

    const { error: updErr } = await supabaseAdmin
      .from("users")
      .update({ access_revoked: false, pending_removal_at: null })
      .eq("id", employeeId);
    if (updErr) return json({ error: `Failed to restore: ${updErr.message}` }, 500);

    // Re-bump Stripe quantity in either case (since revoke decremented it).
    try {
      const { data: sub } = await supabaseAdmin.from("subscriptions")
        .select("stripe_subscription_id").eq("owner_id", caller.id).maybeSingle();
      if (sub?.stripe_subscription_id) {
        const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const item = stripeSub.items.data[0];
        if (item) {
          const currentQty = item.quantity ?? 1;
          const newQty = currentQty + 1;
          // For a pending-removal undo, the period was already paid for,
          // so use proration_behavior:'none'. For a true restore-after-ban,
          // bill the prorated amount immediately.
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            items: [{ id: item.id, quantity: newQty }],
            proration_behavior: wasPending ? "none" : "always_invoice",
          });
          await supabaseAdmin.from("subscriptions")
            .update({ user_count: newQty }).eq("owner_id", caller.id);
        }
      }
    } catch (e) {
      console.error("seat sync failed", e);
    }

    return json({ success: true });
  } catch (e) {
    console.error("restore-employee-access error", e);
    return json({ error: (e as Error)?.message || "Unexpected error" }, 500);
  }
};

serve(handler);
