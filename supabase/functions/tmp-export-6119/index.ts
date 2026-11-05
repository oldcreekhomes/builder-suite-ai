import { createClient } from "npm:@supabase/supabase-js@2";
// TEMPORARY one-time export of 6119 11th St N bill PDFs. Delete after use.
const TOKEN = "63a65883001fb286342930a1b6a3bd264e09aa3920bea715";
const PROJECT = "a50ae540-913d-481f-8e9f-72b64fa5a362";
Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("t") !== TOKEN) return new Response("no", { status: 403 });
  const s = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: bills } = await s.from("bills").select("id").eq("project_id", PROJECT);
  const ids = (bills ?? []).map((b) => b.id);
  const { data: atts, error } = await s.from("bill_attachments").select("bill_id,file_path").in("bill_id", ids);
  if (error) return new Response(error.message, { status: 500 });
  const out = [];
  for (const a of atts ?? []) {
    const { data, error: e } = await s.storage.from("bill-attachments").createSignedUrl(a.file_path, 900);
    out.push({ bill_id: a.bill_id, path: a.file_path, url: data?.signedUrl ?? null, err: e?.message ?? null });
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
