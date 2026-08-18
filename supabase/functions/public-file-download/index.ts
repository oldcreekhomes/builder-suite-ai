import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("share_id");
    const fileId = url.searchParams.get("file_id");
    const photoId = url.searchParams.get("photo_id");
    const openInline = url.searchParams.get("inline") === "true";

    if (!shareId || (!fileId && !photoId)) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase env vars missing");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate share link exists and not expired
    const { data: share, error: shareError } = await supabase
      .from("shared_links")
      .select("share_id, share_type, expires_at, data")
      .eq("share_id", shareId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (shareError || !share) {
      console.error("Share validation error:", shareError);
      return new Response(JSON.stringify({ error: "Share link not found or expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let filePath = null;
    let bucket = "project-files";

    if (fileId) {
      // Find the file in the shared data
      const shareData = share.data as any;
      const file = shareData.files?.find((f: any) => f.id === fileId);
      
      if (!file) {
        return new Response(JSON.stringify({ error: "File not found in share" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      filePath = file.storage_path;
    } else if (photoId) {
      // Find the photo in the shared data
      const shareData = share.data as any;
      const photo = shareData.photos?.find((p: any) => p.id === photoId);
      
      if (!photo) {
        return new Response(JSON.stringify({ error: "Photo not found in share" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Extract path from photo URL
      const photoUrl = photo.url;
      const urlMatch = photoUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
      if (urlMatch) {
        bucket = urlMatch[1];
        filePath = urlMatch[2];
      } else {
        return new Response(JSON.stringify({ error: "Invalid photo URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!filePath) {
      return new Response(JSON.stringify({ error: "File path not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a signed URL for download (valid for 1 hour)
    const signedUrlResult = openInline
      ? await supabase.storage.from(bucket).createSignedUrl(filePath, 3600)
      : await supabase.storage.from(bucket).createSignedUrl(filePath, 3600, { download: true });
    const { data: signedUrlData, error: urlError } = signedUrlResult;

    if (urlError) {
      console.error("Error creating signed URL:", urlError);
      return new Response(JSON.stringify({ error: "Failed to generate download URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (openInline) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: signedUrlData.signedUrl },
      });
    }

    // Return the signed URL for download
    return new Response(JSON.stringify({ 
      download_url: signedUrlData.signedUrl,
      expires_in: 3600 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("public-file-download error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});