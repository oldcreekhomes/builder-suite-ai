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

    const { billing_interval, payment_method_id } = await req.json();
    if (!billing_interval || !PRICES[billing_interval as keyof typeof PRICES]) {
      throw new Error("Invalid billing_interval. Must be 'monthly' or 'annual'.");
    }
    if (!payment_method_id) {
      throw new Error("payment_method_id is required");
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

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { owner_id: ownerId },
      });
      customerId = customer.id;
    }

    // Attach payment method to customer and set as default
    await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity: seatCount }],
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: { owner_id: ownerId, seat_count: String(seatCount) },
    });

    // Upsert subscription record
    await supabaseAdmin.from("subscriptions").upsert({
      owner_id: ownerId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: "active",
      billing_interval,
      user_count: seatCount,
    }, { onConflict: "owner_id" });

    console.log(`✅ Subscription created for owner ${ownerId}, ${seatCount} seats, ${billing_interval}`);

    return new Response(JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      seatCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ create-subscription error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
