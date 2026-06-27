import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Given an owner_id + delta, return what would happen if we changed seat
// count by `delta`. For +N: returns the prorated charge that would post
// today. For -N: returns the date access ends + the new monthly total
// (no immediate charge/refund).
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
    const { delta } = await req.json();
    if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
      return new Response(JSON.stringify({ error: "delta must be a non-zero integer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("id, home_builder_id, role")
      .eq("id", userData.user.id)
      .single();
    if (!profile) throw new Error("Profile not found");
    const ownerId = profile.home_builder_id || profile.id;

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (!subRow?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({
          hasStripeSubscription: false,
          delta,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const sub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id, {
      expand: ["default_payment_method"],
    });
    const item = sub.items.data[0];
    if (!item) throw new Error("Subscription has no items");

    const currentQty = item.quantity ?? 1;
    const newQty = currentQty + delta;
    if (newQty < 1) {
      return new Response(JSON.stringify({ error: "Cannot reduce seat count below 1" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const unitAmount = (item.price.unit_amount ?? 0) / 100;
    const interval = item.price.recurring?.interval || "month";
    const newMonthly = interval === "year" ? (unitAmount * newQty) / 12 : unitAmount * newQty;
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    // Card on file
    let card: { brand: string; last4: string } | null = null;
    const pm = sub.default_payment_method;
    if (pm && typeof pm !== "string" && pm.card) {
      card = { brand: pm.card.brand, last4: pm.card.last4 };
    }

    const result: Record<string, unknown> = {
      hasStripeSubscription: true,
      delta,
      currentQty,
      newQty,
      unitAmount,
      interval,
      newMonthly: Math.round(newMonthly * 100) / 100,
      currentMonthly: Math.round(
        (interval === "year" ? (unitAmount * currentQty) / 12 : unitAmount * currentQty) * 100
      ) / 100,
      currentPeriodEnd: periodEnd,
      card,
    };

    if (delta > 0) {
      // Compute prorated charge using upcoming invoice preview.
      try {
        const preview = await stripe.invoices.retrieveUpcoming({
          customer: sub.customer as string,
          subscription: sub.id,
          subscription_items: [{ id: item.id, quantity: newQty }],
          subscription_proration_behavior: "create_prorations",
        });
        // Sum only proration line items (positive amounts) on this invoice.
        const prorationCents = preview.lines.data
          .filter((l) => l.proration && (l.amount ?? 0) > 0)
          .reduce((sum, l) => sum + (l.amount ?? 0), 0);
        result.prorationAmount = Math.round(prorationCents) / 100;
      } catch (e) {
        console.error("Upcoming invoice preview failed:", e);
        result.prorationAmount = null;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("preview-seat-change error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
