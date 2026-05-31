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
      .from("users").select("home_builder_id, id").eq("id", employeeId).single();
    if (targetErr || !targetUser) return json({ error: "Employee not found" }, 404);
    if (targetUser.home_builder_id !== caller.id) {
      return json({ error: "Employee is not in your company" }, 403);
    }

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", employeeId);
    if (targetRoles?.some((r) => r.role === "owner")) {
      return json({ error: "Cannot revoke access for an owner" }, 403);
    }

    // 1. Ban the auth user permanently — blocks future logins.
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(employeeId, {
      ban_duration: "876000h",
    });
    if (banErr) {
      console.error("ban error", banErr);
      return json({ error: `Failed to ban user: ${banErr.message}` }, 500);
    }

    // 2. Kill every active session immediately on all devices.
    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(employeeId, "global");
    if (signOutErr) console.error("signOut error", signOutErr);

    // 3. Mark the row as revoked (keep all historical data).
    const { error: updErr } = await supabaseAdmin
      .from("users").update({ access_revoked: true }).eq("id", employeeId);
    if (updErr) return json({ error: `Failed to mark revoked: ${updErr.message}` }, 500);

    // 4. Recalculate seat count + push to Stripe.
    try {
      const { count } = await supabaseAdmin
        .from("users").select("id", { count: "exact", head: true })
        .eq("home_builder_id", caller.id).eq("confirmed", true).eq("access_revoked", false);
      const seatCount = 1 + (count || 0);
      await supabaseAdmin.from("subscriptions")
        .update({ user_count: seatCount }).eq("owner_id", caller.id);
      const { data: sub } = await supabaseAdmin.from("subscriptions")
        .select("stripe_subscription_id").eq("owner_id", caller.id).single();
      if (sub?.stripe_subscription_id) {
        const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const itemId = stripeSub.items.data[0]?.id;
        if (itemId) {
          await stripe.subscriptions.update(sub.stripe_subscription_id, {
            items: [{ id: itemId, quantity: seatCount }],
            proration_behavior: "always_invoice",
          });
        }
      }
    } catch (e) {
      console.error("seat sync failed", e);
    }

    return json({ success: true });
  } catch (e: any) {
    console.error("revoke-employee-access error", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
};

serve(handler);
