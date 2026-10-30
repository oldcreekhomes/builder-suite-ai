// Permanent "View invoice online" links: signed with INVOICE_LINK_SECRET,
// resolved on click by the invoice-link function to a fresh Stripe page.
async function hmac(id: string): Promise<string> {
  const secret = Deno.env.get("INVOICE_LINK_SECRET") ?? "";
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signInvoiceId(id: string): Promise<string> {
  return hmac(id);
}

export async function verifyInvoiceSig(id: string, sig: string): Promise<boolean> {
  const expected = await hmac(id);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function buildInvoiceLink(invoiceId: string): Promise<string> {
  const sig = await hmac(invoiceId);
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/invoice-link?id=${encodeURIComponent(invoiceId)}&sig=${sig}`;
}
