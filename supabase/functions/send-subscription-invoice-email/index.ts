import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
    const hostedUrl: string | null = invoice.hostedUrl || null;
    const pdfUrl: string | null = invoice.pdfUrl || null;

    // Fetch the PDF from Stripe's hosted URL (public, no auth needed)
    const attachments: any[] = [];
    if (pdfUrl) {
      try {
        const pdfResp = await fetch(pdfUrl);
        if (pdfResp.ok) {
          const buf = await pdfResp.arrayBuffer();
          attachments.push({
            filename: `Invoice_${number}.pdf`,
            content: arrayBufferToBase64(buf),
          });
        } else {
          console.error(`PDF fetch failed: ${pdfResp.status}`);
        }
      } catch (e) {
        console.error("Error fetching invoice PDF:", e);
      }
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
