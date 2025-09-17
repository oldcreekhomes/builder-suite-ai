import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id");
    const type = url.searchParams.get("type") || "f"; // f = folder/files, p = photo
    const originParam = url.searchParams.get("origin");

    if (!shareId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase env vars missing");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Validate share link exists and not expired (leverages public SELECT policy)
    const { data: share, error } = await supabase
      .from("shared_links")
      .select("share_id, share_type, expires_at")
      .eq("share_id", shareId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("DB error fetching share:", error);
      return new Response(JSON.stringify({ error: "Failed to validate share link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!share) {
      return new Response(JSON.stringify({ error: "Share link not found or expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine target origin
    const targetOrigin = originParam || "https://buildersuite.com"; // fallback to brand domain

    // Choose path - our app handles both files/photos via /s/f/:id
    const path = type === "p" ? `/s/p/${shareId}` : `/s/f/${shareId}`;
    const redirectUrl = `${targetOrigin}${path}`;

    // Temporary redirect to the app route
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  } catch (e) {
    console.error("share-redirect error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});