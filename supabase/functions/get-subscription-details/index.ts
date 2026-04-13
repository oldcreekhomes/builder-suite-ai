import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No Stripe customer found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    const customer = customers.data[0];

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
      expand: ["data.default_payment_method"],
    });

    let subscription = null;
    let paymentMethod = null;

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      const item = sub.items.data[0];

      // Debug logging for billing date
      console.log("[get-subscription-details] Raw sub.current_period_end:", sub.current_period_end);
      console.log("[get-subscription-details] Raw sub.current_period_start:", sub.current_period_start);
      console.log("[get-subscription-details] Sub created:", sub.created);

      // Compute current_period_end with fallback
      let periodEndISO: string | null = null;
      if (sub.current_period_end && typeof sub.current_period_end === "number" && sub.current_period_end > 0) {
        periodEndISO = new Date(sub.current_period_end * 1000).toISOString();
      } else if (sub.current_period_start && typeof sub.current_period_start === "number" && sub.current_period_start > 0) {
        // Fallback: add interval duration to period start
        const intervalMs = item.price.recurring?.interval === "year" ? 365.25 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        periodEndISO = new Date(sub.current_period_start * 1000 + intervalMs).toISOString();
      }

      // Compute current_period_start
      let periodStartISO: string | null = null;
      if (sub.current_period_start && typeof sub.current_period_start === "number" && sub.current_period_start > 0) {
        periodStartISO = new Date(sub.current_period_start * 1000).toISOString();
      }

      subscription = {
        id: sub.id,
        status: sub.status,
        plan_name: typeof item.price.product === "string" ? item.price.product : (item.price.product as any)?.name || "BuilderSuite Pro",
        interval: item.price.recurring?.interval || "month",
        quantity: item.quantity || 1,
        unit_amount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
        total_amount: (item.price.unit_amount ? item.price.unit_amount / 100 : 0) * (item.quantity || 1),
        current_period_start: periodStartISO,
        current_period_end: periodEndISO,
        cancel_at_period_end: sub.cancel_at_period_end,
        created: sub.created ? new Date(sub.created * 1000).toISOString() : null,
      };

      // Payment method
      const pm = sub.default_payment_method;
      if (pm && typeof pm !== "string" && pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        };
      }
    }

    // If no payment method from subscription, try customer default
    if (!paymentMethod && customer.invoice_settings?.default_payment_method) {
      const pmId = customer.invoice_settings.default_payment_method;
      if (typeof pmId === "string") {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        if (pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }
      }
    }

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 10,
    });

    const invoiceList = invoices.data.map((inv) => {
      let dateStr: string | null = null;
      try {
        if (inv.created && typeof inv.created === "number") {
          dateStr = new Date(inv.created * 1000).toISOString();
        }
      } catch (_) {
        dateStr = null;
      }
      return {
        id: inv.id,
        date: dateStr,
        amount: (inv.amount_paid ?? 0) / 100,
        status: inv.status,
        description: inv.lines?.data?.[0]?.description || "BuilderSuite Pro",
        invoice_pdf: inv.invoice_pdf,
      };
    });

    return new Response(
      JSON.stringify({
        subscription,
        paymentMethod,
        billingEmail: customer.email || user.email,
        invoices: invoiceList,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[get-subscription-details] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
