import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function guessContentType(pathOrName: string): string {
  const lower = pathOrName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket");
    const path = url.searchParams.get("path");
    const filenameParam = url.searchParams.get("filename");
    const disposition = (url.searchParams.get("disposition") || "inline").toLowerCase();

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: "Missing required query params: bucket, path" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Derive a safe filename
    const fallbackName = path.split("/").pop() || "download";
    const filename = filenameParam || fallbackName;

    // Initialize Supabase client (prefer service role if available)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE || ANON_KEY);

    // Create a short-lived signed URL then fetch the bytes server-side
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute expiry is enough for server-side fetch

    if (signedError || !signedData?.signedUrl) {
      console.error("Failed to create signed URL", signedError);
      return new Response(JSON.stringify({ error: "Unable to access file" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const fileResp = await fetch(signedData.signedUrl);
    if (!fileResp.ok || !fileResp.body) {
      const txt = await fileResp.text().catch(() => "");
      console.error("Upstream fetch failed:", fileResp.status, txt);
      return new Response(JSON.stringify({ error: "Unable to fetch file bytes" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prefer upstream content-type, otherwise guess from filename/path
    const upstreamType = fileResp.headers.get("content-type");
    const contentType = upstreamType || guessContentType(filename || path);

    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
    });

    // Keep range headers if present (useful for large PDFs)
    const acceptRanges = fileResp.headers.get("accept-ranges");
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
    const contentRange = fileResp.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    return new Response(fileResp.body, { status: 200, headers });
  } catch (err) {
    console.error("file-proxy error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
