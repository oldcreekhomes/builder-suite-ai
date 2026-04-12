import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES = {
  monthly: "price_1TL7DM2OJCoyD632UplhQm6q",
  annual: "price_1TL7Df2OJCoyD632Ap6Jx4ZE",
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
    const user = userData.user;

    const { billing_interval } = await req.json();
    if (!billing_interval || !PRICES[billing_interval as keyof typeof PRICES]) {
      throw new Error("Invalid billing_interval. Must be 'monthly' or 'annual'.");
    }

    const priceId = PRICES[billing_interval as keyof typeof PRICES];

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("id, home_builder_id, role, company_name")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    const ownerId = profile.home_builder_id || profile.id;
    if (ownerId !== user.id) {
      throw new Error("Only the company owner can manage subscriptions");
    }

    const { count: employeeCount } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("home_builder_id", ownerId)
      .eq("confirmed", true);

    const seatCount = 1 + (employeeCount || 0);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://buildersuiteml.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [{ price: priceId, quantity: seatCount }],
      mode: "subscription",
      ui_mode: "embedded",
      payment_method_types: ['card'],
      saved_payment_method_options: {
        payment_method_save: 'disabled',
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: { owner_id: ownerId, seat_count: String(seatCount) },
      },
      return_url: `${origin}/?subscription=success`,
      metadata: { owner_id: ownerId },
    });

    // Upsert subscription record as trialing
    await supabaseAdmin.from("subscriptions").upsert({
      owner_id: ownerId,
      stripe_customer_id: customerId || null,
      status: "trialing",
      billing_interval,
      user_count: seatCount,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "owner_id" });

    console.log(`✅ Checkout session created for owner ${ownerId}, ${seatCount} seats, ${billing_interval}`);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ create-checkout-session error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
