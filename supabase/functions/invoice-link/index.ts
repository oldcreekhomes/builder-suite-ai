import Stripe from "npm:stripe@18";
import { verifyInvoiceSig } from "../_shared/invoiceLink.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>BuilderSuite ML Invoice</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px;">
<div style="max-width:480px;margin:auto;background:#fff;border-radius:8px;padding:32px;">
<h2 style="margin-top:0">BuilderSuite ML</h2>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!/^in_[A-Za-z0-9]{8,64}$/.test(id) || !/^[0-9a-f]{64}$/.test(sig) || !(await verifyInvoiceSig(id, sig))) {
    return page("<p>This invoice link is not valid.</p>", 404);
  }
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2025-08-27.basil" });
    const inv: any = await stripe.invoices.retrieve(id);
    if (inv.hosted_invoice_url) {
      return new Response(null, { status: 302, headers: { Location: inv.hosted_invoice_url } });
    }
    const date = new Date(inv.created * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return page(`<p><b>Invoice:</b> ${esc(inv.number || inv.id)}</p><p><b>Date:</b> ${date}</p>
<p><b>Amount Paid:</b> $${((inv.amount_paid ?? 0) / 100).toFixed(2)}</p><p><b>Status:</b> ${esc(String(inv.status).toUpperCase())}</p>`);
  } catch (e) {
    console.error("[invoice-link]", e);
    return page("<p>We couldn't load this invoice right now. Please try again shortly.</p>", 502);
  }
});
