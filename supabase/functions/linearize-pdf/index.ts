// Rewrites a PDF in storage so it streams better in the browser.
// Uses pdf-lib (Deno-native) with useObjectStreams disabled, which produces
// a sequentially-laid-out PDF that PDF.js can render with HTTP Range requests
// instead of needing the whole file. Lossless.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  bucket?: string;
  path?: string;
  // If provided, processes up to N candidates from project-files instead of a single file.
  backfill?: boolean;
  limit?: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function rewritePdf(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return await doc.save({
    useObjectStreams: false, // critical for streaming
    addDefaultPage: false,
  });
}

async function linearizeOne(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<{ ok: boolean; bucket: string; path: string; before?: number; after?: number; error?: string }> {
  try {
    const dl = await supabase.storage.from(bucket).download(path);
    if (dl.error || !dl.data) return { ok: false, bucket, path, error: dl.error?.message ?? "download failed" };
    const inputBytes = new Uint8Array(await dl.data.arrayBuffer());

    let outputBytes: Uint8Array;
    try {
      outputBytes = await rewritePdf(inputBytes);
    } catch (e) {
      return { ok: false, bucket, path, error: `rewrite failed: ${(e as Error).message}` };
    }

    const up = await supabase.storage
      .from(bucket)
      .update(path, new Blob([outputBytes], { type: "application/pdf" }), {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "3600",
      });
    if (up.error) return { ok: false, bucket, path, error: `upload failed: ${up.error.message}` };

    return { ok: true, bucket, path, before: inputBytes.byteLength, after: outputBytes.byteLength };
  } catch (e) {
    return { ok: false, bucket, path, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: Body = {};
  try { body = await req.json(); } catch { /* ignore */ }

  // Backfill mode: pull a batch of PDFs from project_files that aren't yet linearized
  if (body.backfill) {
    const limit = Math.min(body.limit ?? 5, 20);
    const { data: rows, error } = await supabase
      .from("project_files")
      .select("id, file_path, original_filename")
      .eq("is_deleted", false)
      .is("is_linearized", false)
      .or("original_filename.ilike.%.pdf,file_path.ilike.%.pdf")
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const results: any[] = [];
    for (const row of rows ?? []) {
      const r = await linearizeOne(supabase, "project-files", row.file_path);
      results.push({ id: row.id, ...r });
      if (r.ok) {
        await supabase.from("project_files").update({ is_linearized: true }).eq("id", row.id);
      } else {
        await supabase.from("project_files").update({
          is_linearized: false,
          linearize_error: r.error?.slice(0, 500) ?? null,
        }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Single-file mode
  if (!body.bucket || !body.path) {
    return new Response(JSON.stringify({ error: "bucket and path required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await linearizeOne(supabase, body.bucket, body.path);
  if (result.ok) {
    await supabase.from("project_files")
      .update({ is_linearized: true })
      .eq("file_path", body.path);
  }
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
