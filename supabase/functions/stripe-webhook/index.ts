import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // If we have a webhook secret, verify signature; otherwise parse directly
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`📨 Stripe webhook: ${event.type} (${event.id})`);

    const subscription = event.data.object as Stripe.Subscription;

    // Find owner by stripe_customer_id or metadata
    const ownerId = subscription.metadata?.owner_id;
    if (!ownerId) {
      console.log("⚠️ No owner_id in metadata, trying customer lookup...");
    }

    const findOwner = async (): Promise<string | null> => {
      if (ownerId) return ownerId;
      // Fallback: find by stripe_customer_id
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("owner_id")
        .eq("stripe_customer_id", subscription.customer as string)
        .single();
      return data?.owner_id || null;
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const owner = await findOwner();
        if (!owner) {
          console.error("❌ Cannot find owner for subscription");
          break;
        }

        let status: string;
        switch (subscription.status) {
          case "active": status = "active"; break;
          case "trialing": status = "trialing"; break;
          case "past_due": status = "past_due"; break;
          case "canceled": status = "canceled"; break;
          case "unpaid": status = "unpaid"; break;
          default: status = subscription.status;
        }

        const interval = subscription.items.data[0]?.plan?.interval === "year" ? "annual" : "monthly";

        await supabaseAdmin.from("subscriptions").upsert({
          owner_id: owner,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status,
          billing_interval: interval,
          user_count: subscription.items.data[0]?.quantity || 1,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "owner_id" });

        console.log(`✅ Subscription ${status} for owner ${owner}`);
        break;
      }

      case "customer.subscription.deleted": {
        const owner = await findOwner();
        if (owner) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "canceled" })
            .eq("owner_id", owner);
          console.log(`✅ Subscription canceled for owner ${owner}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const { data: sub } = await supabaseAdmin
          .from("subscriptions")
          .select("owner_id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (sub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("owner_id", sub.owner_id);
          console.log(`⚠️ Payment failed for owner ${sub.owner_id}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Log event
    const owner = await findOwner();
    if (owner) {
      const { data: subRecord } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("owner_id", owner)
        .single();
      if (subRecord) {
        await supabaseAdmin.from("subscription_events").upsert({
          subscription_id: subRecord.id,
          event_type: event.type,
          stripe_event_id: event.id,
          data: event.data.object as any,
        }, { onConflict: "stripe_event_id" });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
