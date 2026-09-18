import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { projectId, statementAccountId, uploadedBy, files } = body as {
      projectId: string;
      statementAccountId: string;
      uploadedBy: string;
      files: { name: string; statementDate: string; base64: string }[];
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results: unknown[] = [];

    for (const f of files) {
      const bin = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
      const originalFilename = `Bank Statements/${f.name}`;
      const fileId = crypto.randomUUID();
      const storageName = `${projectId}/${fileId}_${originalFilename}`;

      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(storageName, bin, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(`upload ${f.name}: ${upErr.message}`);

      const { error: insErr } = await supabase.from("project_files").insert({
        project_id: projectId,
        filename: storageName,
        original_filename: originalFilename,
        file_size: bin.length,
        file_type: "pdf",
        mime_type: "application/pdf",
        storage_path: storageName,
        uploaded_by: uploadedBy,
        created_by: uploadedBy,
        updated_by: uploadedBy,
        is_deleted: false,
        statement_date: f.statementDate,
        statement_account_id: statementAccountId,
      });
      if (insErr) throw new Error(`insert ${f.name}: ${insErr.message}`);

      results.push({ name: f.name, storageName, size: bin.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
