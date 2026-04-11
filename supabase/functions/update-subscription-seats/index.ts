import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Get the user's owner context
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("id, home_builder_id, role")
      .eq("id", userData.user.id)
      .single();

    if (!profile) throw new Error("Profile not found");
    const ownerId = profile.home_builder_id || profile.id;

    // Get subscription
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    if (!subscription || !subscription.stripe_subscription_id) {
      // No active Stripe subscription — just update local count
      const { count } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("home_builder_id", ownerId)
        .eq("confirmed", true);

      const seatCount = 1 + (count || 0);

      if (subscription) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ user_count: seatCount })
          .eq("owner_id", ownerId);
      }

      return new Response(JSON.stringify({ seats: seatCount, synced: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Count current users
    const { count: employeeCount } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("home_builder_id", ownerId)
      .eq("confirmed", true);

    const seatCount = 1 + (employeeCount || 0);

    // Update Stripe subscription quantity
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const itemId = stripeSub.items.data[0]?.id;

    if (itemId && stripeSub.items.data[0]?.quantity !== seatCount) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{ id: itemId, quantity: seatCount }],
        proration_behavior: "always_invoice",
      });
      console.log(`✅ Updated Stripe seats from ${stripeSub.items.data[0]?.quantity} to ${seatCount}`);
    }

    // Update local record
    await supabaseAdmin
      .from("subscriptions")
      .update({ user_count: seatCount })
      .eq("owner_id", ownerId);

    return new Response(JSON.stringify({ seats: seatCount, synced: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ update-subscription-seats error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
