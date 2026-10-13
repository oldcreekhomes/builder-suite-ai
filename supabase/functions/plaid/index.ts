import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const PLAID_ENV = (Deno.env.get("PLAID_ENV") || "production").trim().toLowerCase();
const PLAID_BASE = PLAID_ENV === "sandbox" ? "https://sandbox.plaid.com" : "https://production.plaid.com";
const REDIRECT_URI = "https://app.buildersuiteai.com/plaid/oauth";
const ALLOWED_REDIRECTS = new Set([
  "https://app.buildersuiteai.com/plaid/oauth",
  "https://buildersuiteai.com/plaid/oauth",
  "https://builder-suite-ai.lovable.app/plaid/oauth",
  "https://id-preview--7f4eccd7-6d58-465f-a474-4c0fb79b4bab.lovable.app/plaid/oauth",
]);

class PlaidError extends Error {}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function plaid(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PLAID_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("PLAID_CLIENT_ID"),
      secret: Deno.env.get("PLAID_SECRET"),
      ...body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new PlaidError(data.error_message || data.error_code || `Plaid error ${res.status}`);
  return data;
}

// deno-lint-ignore no-explicit-any
async function syncConnection(admin: any, connectionId: string, ownerId: string, accessToken: string) {
  const bal = await plaid("/accounts/balance/get", { access_token: accessToken });
  const now = new Date().toISOString();
  for (const a of bal.accounts || []) {
    const { error } = await admin.from("bank_connection_accounts").upsert({
      connection_id: connectionId,
      owner_id: ownerId,
      plaid_account_id: a.account_id,
      name: a.official_name || a.name || null,
      mask: a.mask || null,
      current_balance: a.balances?.current ?? null,
      available_balance: a.balances?.available ?? null,
      last_synced_at: now,
      updated_at: now,
    }, { onConflict: "plaid_account_id" });
    if (error) throw error;
  }
  await admin.from("bank_connections").update({ last_synced_at: now, last_error: null, updated_at: now }).eq("id", connectionId);
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link_token"), redirect_uri: z.string().url().optional() }),
  z.object({
    action: z.literal("exchange"),
    public_token: z.string().min(1),
    institution_name: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal("refresh") }),
  z.object({
    action: z.literal("assign"),
    bank_account_id: z.string().uuid().nullable(),
    project_id: z.string().uuid(),
    account_id: z.string().uuid(),
  }),
  z.object({ action: z.literal("disconnect"), connection_id: z.string().uuid() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const uid = userData.user.id;

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("users").select("home_builder_id, confirmed").eq("id", uid).maybeSingle();
    const ownerId = profile?.home_builder_id && profile.confirmed ? profile.home_builder_id : uid;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;

    if (b.action === "link_token") {
      const data = await plaid("/link/token/create", {
        user: { client_user_id: uid },
        client_name: "BuilderSuite ML",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
        redirect_uri: b.redirect_uri && ALLOWED_REDIRECTS.has(b.redirect_uri) ? b.redirect_uri : REDIRECT_URI,
      });
      return json({ link_token: data.link_token });
    }

    if (b.action === "exchange") {
      const ex = await plaid("/item/public_token/exchange", { public_token: b.public_token });
      const now = new Date().toISOString();
      const { data: conn, error } = await admin.from("bank_connections").upsert({
        owner_id: ownerId,
        plaid_item_id: ex.item_id,
        access_token: ex.access_token,
        institution_name: b.institution_name ?? null,
        last_synced_at: now,
        last_error: null,
        created_by: uid,
        updated_at: now,
      }, { onConflict: "plaid_item_id" }).select("id").single();
      if (error) throw error;
      await syncConnection(admin, conn.id, ownerId, ex.access_token);
      return json({ ok: true });
    }

    if (b.action === "refresh") {
      const { data: conns, error } = await admin.from("bank_connections")
        .select("id, access_token").eq("owner_id", ownerId);
      if (error) throw error;
      let updated = 0;
      for (const c of conns || []) {
        try {
          await syncConnection(admin, c.id, ownerId, c.access_token);
          updated++;
        } catch (e) {
          await admin.from("bank_connections").update({ last_error: String((e as Error).message).slice(0, 500) }).eq("id", c.id);
        }
      }
      return json({ ok: true, updated, total: conns?.length || 0 });
    }

    if (b.action === "assign") {
      const { data: project } = await admin.from("projects").select("id").eq("id", b.project_id).eq("owner_id", ownerId).maybeSingle();
      if (!project) return json({ error: "Project not found" }, 404);
      // Clear any existing link for this job + book account
      await admin.from("bank_connection_accounts").update({ project_id: null, account_id: null })
        .eq("owner_id", ownerId).eq("project_id", b.project_id).eq("account_id", b.account_id);
      if (b.bank_account_id) {
        const { error } = await admin.from("bank_connection_accounts")
          .update({ project_id: b.project_id, account_id: b.account_id, updated_at: new Date().toISOString() })
          .eq("id", b.bank_account_id).eq("owner_id", ownerId);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (b.action === "disconnect") {
      const { data: c } = await admin.from("bank_connections").select("id, access_token")
        .eq("id", b.connection_id).eq("owner_id", ownerId).maybeSingle();
      if (!c) return json({ error: "Not found" }, 404);
      try { await plaid("/item/remove", { access_token: c.access_token }); } catch { /* already removed */ }
      await admin.from("bank_connections").delete().eq("id", c.id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    // Expected Plaid refusals return 200 + { error } so the app shows a short message
    if (e instanceof PlaidError) return json({ error: e.message });
    return json({ error: (e as Error).message }, 500);
  }
});
