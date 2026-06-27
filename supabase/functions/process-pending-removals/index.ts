import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Runs daily via pg_cron. For every user whose `pending_removal_at` has
// passed, ban the auth user, kill sessions, and mark access_revoked.
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
    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabaseAdmin
      .from("users")
      .select("id, home_builder_id, pending_removal_at")
      .lte("pending_removal_at", nowIso)
      .eq("access_revoked", false);

    if (error) throw error;
    console.log(`[process-pending-removals] ${due?.length ?? 0} users due for removal`);

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const u of due ?? []) {
      try {
        const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(u.id, {
          ban_duration: "876000h",
        });
        if (banErr) throw banErr;

        await supabaseAdmin.auth.admin.signOut(u.id, "global").catch((e) =>
          console.error("signOut error", u.id, e)
        );

        const { error: updErr } = await supabaseAdmin
          .from("users")
          .update({ access_revoked: true, pending_removal_at: null })
          .eq("id", u.id);
        if (updErr) throw updErr;

        results.push({ id: u.id, ok: true });
        console.log(`[process-pending-removals] ✅ revoked ${u.id}`);
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`[process-pending-removals] ❌ ${u.id}: ${msg}`);
        results.push({ id: u.id, ok: false, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("process-pending-removals error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
