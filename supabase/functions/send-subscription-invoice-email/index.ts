const serve = (handler: (req: Request) => Response | Promise<Response>) => Deno.serve(handler);
import { Resend } from "npm:resend@4";
import { buildInvoiceLink } from "../_shared/invoiceLink.ts";
import { buildSubscriptionInvoicePdf } from "../_shared/subscriptionInvoicePdf.ts";
import Stripe from "npm:stripe@18";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

async function buildBrandedPdf(invoice: any, recipientEmail: string, amount: number): Promise<Uint8Array> {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });
  const inv: any = await stripe.invoices.retrieve(String(invoice.id), { expand: ["payments", "customer"] });
  const line = inv.lines?.data?.[0];
  let cardBrand: string | null = null, cardLast4: string | null = null;
  try {
    const piRef = inv.payments?.data?.find((p: any) => p.payment?.payment_intent)?.payment?.payment_intent ?? inv.payment_intent;
    const piId = typeof piRef === "string" ? piRef : piRef?.id;
    if (piId) {
      const pi: any = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      const card = pi.latest_charge?.payment_method_details?.card;
      if (card) { cardBrand = card.brand; cardLast4 = card.last4; }
    }
  } catch (e) { console.error("card lookup failed", e); }

  let companyName: string | null = null;
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
    const { data: sub } = await admin.from("subscriptions").select("owner_id").eq("stripe_customer_id", customerId).maybeSingle();
    if ((sub as any)?.owner_id) {
      const { data: u } = await admin.from("users").select("company_name").eq("id", (sub as any).owner_id).maybeSingle();
      companyName = (u as any)?.company_name || null;
    }
    if (!companyName) companyName = inv.customer?.name || null;
  } catch (e) { console.error("company lookup failed", e); }

  return await buildSubscriptionInvoicePdf({
    id: inv.id,
    date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    amount,
    status: inv.status,
    description: line?.description || "BuilderSuite Pro",
    periodStart: line?.period?.start ? new Date(line.period.start * 1000).toISOString() : null,
    periodEnd: line?.period?.end ? new Date(line.period.end * 1000).toISOString() : null,
    cardBrand, cardLast4,
    billingEmail: inv.customer_email || recipientEmail,
    companyName,
  });
}

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as any
    );
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const recipientEmail = (body?.recipientEmail ?? "").toString().trim();
    const invoice = body?.invoice ?? {};

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const number: string = invoice.number || invoice.id || "Invoice";
    const amount: number = Number(invoice.amountPaid ?? 0) / 100;
    const currency: string = (invoice.currency || "usd").toUpperCase();
    const periodStart = invoice.periodStart
      ? new Date(invoice.periodStart * 1000).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : null;
    const periodEnd = invoice.periodEnd
      ? new Date(invoice.periodEnd * 1000).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : null;
    const hostedUrl: string | null = invoice.id ? await buildInvoiceLink(String(invoice.id)) : (invoice.hostedUrl || null);

    // Skip $0 adjustment invoices entirely
    if (Math.round(amount * 100) === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "zero" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Build the same BuilderSuite ML invoice PDF the Subscription page downloads
    const attachments: any[] = [];
    try {
      const pdfBytes = await buildBrandedPdf(invoice, recipientEmail, amount);
      attachments.push({ filename: `Invoice_${number}.pdf`, content: arrayBufferToBase64(pdfBytes.buffer as ArrayBuffer) });
    } catch (e) {
      console.error("Error building invoice PDF:", e);
    }

    const amountStr = `$${amount.toFixed(2)} ${currency}`;
    const periodStr = periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : "N/A";

    const emailResponse = await resend.emails.send({
      from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
      to: [recipientEmail],
      subject: `Your BuilderSuite ML invoice ${number}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background:#ffffff;border-collapse:collapse;">
        <tr><td align="center" style="padding:40px 30px;background:#000000;">
          <h1 style="color:#fff;font-size:28px;margin:0 0 10px 0;">BuilderSuite ML</h1>
          <p style="color:#ccc;font-size:16px;margin:0;">Payment Receipt</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="color:#000;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            Thank you for your payment. Your subscription invoice is attached for your records.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e5e5;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px 0;font-size:14px;"><span style="color:#666;display:inline-block;width:130px;">Invoice:</span><strong>${number}</strong></p>
              <p style="margin:0 0 8px 0;font-size:14px;"><span style="color:#666;display:inline-block;width:130px;">Amount Paid:</span><strong>${amountStr}</strong></p>
              <p style="margin:0 0 8px 0;font-size:14px;"><span style="color:#666;display:inline-block;width:130px;">Billing Period:</span><strong>${periodStr}</strong></p>
              <p style="margin:0;font-size:14px;"><span style="color:#666;display:inline-block;width:130px;">Billed To:</span><strong>${recipientEmail}</strong></p>
            </td></tr>
          </table>
          ${hostedUrl ? `<p style="margin:24px 0 0 0;font-size:14px;"><a href="${hostedUrl}" style="color:#000;text-decoration:underline;" target="_blank">View invoice online</a></p>` : ""}
        </td></tr>
        <tr><td align="center" style="padding:30px;background:#f8f8f8;">
          <p style="color:#666;font-size:14px;margin:0;">
            <a href="https://www.buildersuiteml.com" style="color:#666;text-decoration:underline;" target="_blank">www.buildersuiteml.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      attachments,
    });

    if (emailResponse.error) {
      console.error("Email failed to send:", emailResponse.error);
      return new Response(JSON.stringify({ error: "Failed to send invoice email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-subscription-invoice-email] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
