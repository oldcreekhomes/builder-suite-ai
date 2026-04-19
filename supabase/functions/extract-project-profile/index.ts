import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  takeoff_project_id: string;
  image_paths: string[]; // storage paths in project-files bucket
}

const PROFILE_TOOL = {
  type: "function",
  function: {
    name: "record_project_profile",
    description:
      "Record the structured architectural project profile extracted from the drawing sheets.",
    parameters: {
      type: "object",
      properties: {
        total_sf: { type: ["number", "null"], description: "Total square footage including all conditioned and unconditioned space if shown." },
        heated_sf: { type: ["number", "null"], description: "Heated/conditioned square footage." },
        unheated_sf: { type: ["number", "null"], description: "Unheated square footage (garage, porches, unfinished basement)." },
        bedrooms: { type: ["integer", "null"] },
        full_baths: { type: ["integer", "null"] },
        half_baths: { type: ["integer", "null"] },
        stories: { type: ["integer", "null"] },
        garage_bays: { type: ["integer", "null"] },
        garage_type: { type: ["string", "null"], enum: ["attached", "detached", "none", null] },
        basement_type: { type: ["string", "null"], enum: ["none", "unfinished", "finished", null] },
        basement_sf: { type: ["number", "null"] },
        foundation_type: { type: ["string", "null"], enum: ["slab", "crawl", "basement", null] },
        roof_type: { type: ["string", "null"], description: "e.g., gable, hip, shed, gambrel" },
        exterior_type: { type: ["string", "null"], description: "e.g., brick, vinyl, fiber cement, stucco" },
        footprint_length: { type: ["number", "null"], description: "Building footprint length in feet, if visible on site/floor plan." },
        footprint_width: { type: ["number", "null"] },
        confidence: {
          type: "object",
          description: "Per-field confidence: high, medium, or low. Use low when not visible.",
          additionalProperties: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
      required: ["confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-context client to verify identity & for RLS-safe profile upsert
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    if (!body.takeoff_project_id || !Array.isArray(body.image_paths) || body.image_paths.length === 0) {
      return new Response(JSON.stringify({ error: "takeoff_project_id and image_paths[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Generate signed URLs (or use public URLs) for each image so the model can fetch them
    const imageUrls: string[] = [];
    for (const path of body.image_paths.slice(0, 12)) {
      const { data, error } = await admin.storage
        .from("project-files")
        .createSignedUrl(path, 60 * 30);
      if (error || !data?.signedUrl) {
        console.warn("Failed to sign url for", path, error);
        continue;
      }
      imageUrls.push(data.signedUrl);
    }

    if (imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "No accessible images" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      {
        type: "text",
        text:
          "You are an expert construction estimator. Analyze these architectural drawing sheets and extract a structured project profile. Use only what is clearly visible. For any field you cannot determine, return null and mark its confidence as 'low'. Square footages should be in square feet, dimensions in feet.",
      },
      ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: userContent }],
        tools: [PROFILE_TOOL],
        tool_choice: { type: "function", function: { name: "record_project_profile" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response", JSON.stringify(aiJson).slice(0, 1000));
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profile: any;
    try {
      profile = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "Invalid AI output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert via user client so RLS applies
    const upsertPayload = {
      takeoff_project_id: body.takeoff_project_id,
      owner_id: userId,
      total_sf: profile.total_sf ?? null,
      heated_sf: profile.heated_sf ?? null,
      unheated_sf: profile.unheated_sf ?? null,
      bedrooms: profile.bedrooms ?? null,
      full_baths: profile.full_baths ?? null,
      half_baths: profile.half_baths ?? null,
      stories: profile.stories ?? null,
      garage_bays: profile.garage_bays ?? null,
      garage_type: profile.garage_type ?? null,
      basement_type: profile.basement_type ?? null,
      basement_sf: profile.basement_sf ?? null,
      foundation_type: profile.foundation_type ?? null,
      roof_type: profile.roof_type ?? null,
      exterior_type: profile.exterior_type ?? null,
      footprint_length: profile.footprint_length ?? null,
      footprint_width: profile.footprint_width ?? null,
      ai_confidence: profile.confidence ?? {},
      raw_extraction: profile,
    };

    const { data: upserted, error: upsertErr } = await userClient
      .from("takeoff_project_profiles")
      .upsert(upsertPayload, { onConflict: "takeoff_project_id" })
      .select()
      .single();

    if (upsertErr) {
      console.error("Upsert error", upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profile: upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-project-profile error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
