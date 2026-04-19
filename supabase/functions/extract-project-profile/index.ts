import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  takeoff_project_id: string;
  image_paths: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    if (!body.takeoff_project_id || !Array.isArray(body.image_paths) || body.image_paths.length === 0) {
      return json({ error: "takeoff_project_id and image_paths[] required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Look up takeoff project owner so we can fetch its company's estimate cost codes
    const { data: tp, error: tpErr } = await admin
      .from("takeoff_projects")
      .select("owner_id")
      .eq("id", body.takeoff_project_id)
      .maybeSingle();
    if (tpErr || !tp) return json({ error: "Takeoff project not found" }, 404);
    const ownerId = tp.owner_id;

    // Fetch estimate-flagged cost codes (leaf nodes only)
    const { data: costCodes, error: ccErr } = await admin
      .from("cost_codes")
      .select("id, code, name, unit_of_measure, category, parent_group, has_subcategories, estimate")
      .eq("owner_id", ownerId)
      .eq("estimate", true)
      .order("code");
    if (ccErr) console.warn("cost_codes lookup failed", ccErr);

    const leafCodes = (costCodes ?? []).filter((c) => !c.has_subcategories);
    const allowedIds = leafCodes.map((c) => c.id);

    // Sign URLs
    const imageUrls: string[] = [];
    for (const path of body.image_paths.slice(0, 16)) {
      const { data, error } = await admin.storage
        .from("project-files")
        .createSignedUrl(path, 60 * 30);
      if (error || !data?.signedUrl) {
        console.warn("Failed to sign url for", path, error);
        continue;
      }
      imageUrls.push(data.signedUrl);
    }
    if (imageUrls.length === 0) return json({ error: "No accessible images" }, 400);

    // Build dynamic tool schema with enum of allowed cost code ids
    const PROFILE_TOOL: any = {
      type: "function",
      function: {
        name: "record_project_profile",
        description:
          "Record the structured architectural project profile and itemized estimate items extracted from the drawing sheets.",
        parameters: {
          type: "object",
          properties: {
            area_schedule: {
              type: "array",
              description:
                "Verbatim copy of the Area Schedule / Area Calculations / Square Footage table on the drawings. Copy each labeled bucket (Main Level, Second Level, Finished Basement, Garage, Covered Porch, Unfinished Basement, Total Finished, etc.) exactly as drawn. Do not infer or sum.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  sf: { type: ["number", "null"] },
                },
                required: ["label"],
                additionalProperties: false,
              },
            },
            roof_pitches: {
              type: "array",
              description: "Roof pitches read from roof plan / building section labels, e.g. ['8/12 main', '10/12 porch']",
              items: { type: "string" },
            },
            bedrooms: { type: ["integer", "null"] },
            full_baths: { type: ["integer", "null"] },
            half_baths: { type: ["integer", "null"] },
            stories: { type: ["integer", "null"] },
            garage_bays: { type: ["integer", "null"] },
            garage_type: { type: ["string", "null"], enum: ["attached", "detached", "none", null] },
            basement_type: { type: ["string", "null"], enum: ["none", "unfinished", "finished", null] },
            basement_sf: { type: ["number", "null"] },
            foundation_type: { type: ["string", "null"], enum: ["slab", "crawl", "basement", null] },
            roof_type: { type: ["string", "null"] },
            exterior_type: { type: ["string", "null"] },
            footprint_length: { type: ["number", "null"] },
            footprint_width: { type: ["number", "null"] },
            confidence: {
              type: "object",
              additionalProperties: { type: "string", enum: ["high", "medium", "low"] },
            },
            estimate_items: {
              type: "array",
              description:
                "Itemized list of construction elements visible on the drawings (windows, exterior doors, interior doors, garage doors, roof areas/pitches, siding, concrete elements, etc). EACH item MUST be matched to one of the allowed cost_code_id values from the Allowed Cost Codes list provided in the user prompt. Skip items that don't match any allowed cost code.",
              items: {
                type: "object",
                properties: {
                  cost_code_id: allowedIds.length > 0
                    ? { type: "string", enum: allowedIds }
                    : { type: "string" },
                  cost_code_label: { type: "string", description: "e.g. '4380.2 Windows - Double'" },
                  item_label: { type: "string", description: "e.g. 'Bedroom 2 window', 'Front entry door'" },
                  size: { type: ["string", "null"], description: "Verbatim size, e.g. \"3'-0\\\" x 6'-8\\\"\" or '16' x 7''" },
                  quantity: { type: "number" },
                  unit: { type: "string", enum: ["EA", "LF", "SF", "CY"], description: "EA for counted items, LF for linear, SF for square footage" },
                  spec: {
                    type: "object",
                    description: "Free-form spec, e.g. { swing: 'LH', material: 'fiberglass', glazing: 'tempered', pitch: '8/12' }",
                    additionalProperties: true,
                  },
                  source_sheet: { type: ["string", "null"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: ["string", "null"] },
                },
                required: ["cost_code_label", "quantity", "unit", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["confidence", "area_schedule", "estimate_items"],
          additionalProperties: false,
        },
      },
    };

    const allowedList = leafCodes
      .map((c) => `- ${c.id} | ${c.code} ${c.name}${c.unit_of_measure ? ` (${c.unit_of_measure})` : ""}`)
      .join("\n");

    const promptText =
`You are an expert construction estimator performing PRECISE OCR on architectural drawings. Carefully analyze EVERY drawing sheet provided and extract:

PASS A — PROJECT PROFILE
- Bedrooms, baths (full / half), stories, garage bays + type, basement type + SF, foundation, roof type, exterior, footprint dims.
- AREA SCHEDULE — CRITICAL OCR TASK:
  • Find the table titled "Area Schedule", "Area Calculations", "Square Footage", "Area Tabulation", or similar. It is usually on the cover sheet, floor plan sheet, or a dedicated schedule sheet.
  • For EACH ROW of that table, copy the LABEL exactly as printed and READ THE SF NUMBER DIGIT-BY-DIGIT from the drawing. Do NOT estimate, infer, round, or sum. Do NOT calculate from floor plan dimensions — only read what is printed in the schedule table.
  • Numbers must be returned as raw integers with NO thousands separators (e.g. 1154 not 1,154 and not 1.154). Do not drop or add digits.
  • If you cannot clearly read a digit, return null for that row's sf rather than guessing.
  • Double-check each number you return by re-reading the same cell on the drawing before finalizing.
- ROOF PITCHES: Read from the roof plan or building section labels (e.g. '8/12', '12/12'). Include location qualifiers when shown.

PASS B — ESTIMATE ITEMS
For EACH item that matches one of the Allowed Cost Codes below, return one row in estimate_items[]. Look hard at:
  • Window schedules and elevations — return each window: size, count, location, single/double/triple
  • Exterior door schedules — size (e.g. 3'-0" x 6'-8"), swing, material, location
  • Interior door schedules — size, swing, location, count by size
  • Garage doors — count and size (single 9'x7' vs double 16'x7')
  • Roof pitches and roof areas
  • Siding (lap vs board & batten) with approx LF/SF when elevations are dimensioned
  • Concrete: footings, basement slab, garage slab, porch slab, drain tile, piers, egress windows
  • Anything else that matches an allowed cost code
Set quantity (numeric) and unit (EA/LF/SF/CY). Use confidence='high' only when the value is clearly readable on the drawing. If you cannot determine quantity precisely, give your best count and mark confidence accordingly.

ALLOWED COST CODES (cost_code_id | code name (unit)) — only emit estimate_items whose cost_code_id is in this list:
${allowedList || "(none configured — skip estimate_items)"}
`;

    const userContent: any[] = [
      { type: "text", text: promptText },
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
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted. Add funds in workspace settings." }, 402);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response", JSON.stringify(aiJson).slice(0, 1000));
      return json({ error: "AI did not return structured data" }, 502);
    }

    let extraction: any;
    try {
      extraction = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Invalid AI output" }, 502);
    }

    // Compute derived SF for historical matching
    const areaSchedule: Array<{ label: string; sf: number | null }> = Array.isArray(extraction.area_schedule)
      ? extraction.area_schedule
      : [];
    const isUnheated = (label: string) => /garage|porch|patio|deck|unfinished|unconditioned/i.test(label);
    const isTotalRow = (label: string) => /^total/i.test(label?.trim() ?? "");
    let heated = 0, unheated = 0;
    for (const row of areaSchedule) {
      if (typeof row?.sf !== "number" || isTotalRow(row.label || "")) continue;
      if (isUnheated(row.label || "")) unheated += row.sf;
      else heated += row.sf;
    }
    const totalRow = areaSchedule.find((r) => isTotalRow(r.label || "") && /finish/i.test(r.label || ""));
    const heatedFinal = totalRow?.sf ?? (heated > 0 ? heated : null);
    const unheatedFinal = unheated > 0 ? unheated : null;
    const totalFinal = (heatedFinal ?? 0) + (unheatedFinal ?? 0) || null;

    const upsertPayload = {
      takeoff_project_id: body.takeoff_project_id,
      owner_id: userId,
      total_sf: totalFinal,
      heated_sf: heatedFinal,
      unheated_sf: unheatedFinal,
      bedrooms: extraction.bedrooms ?? null,
      full_baths: extraction.full_baths ?? null,
      half_baths: extraction.half_baths ?? null,
      stories: extraction.stories ?? null,
      garage_bays: extraction.garage_bays ?? null,
      garage_type: extraction.garage_type ?? null,
      basement_type: extraction.basement_type ?? null,
      basement_sf: extraction.basement_sf ?? null,
      foundation_type: extraction.foundation_type ?? null,
      roof_type: extraction.roof_type ?? null,
      exterior_type: extraction.exterior_type ?? null,
      footprint_length: extraction.footprint_length ?? null,
      footprint_width: extraction.footprint_width ?? null,
      area_schedule: areaSchedule,
      roof_pitches: Array.isArray(extraction.roof_pitches) ? extraction.roof_pitches : [],
      ai_confidence: extraction.confidence ?? {},
      raw_extraction: extraction,
    };

    const { data: upserted, error: upsertErr } = await userClient
      .from("takeoff_project_profiles")
      .upsert(upsertPayload, { onConflict: "takeoff_project_id" })
      .select()
      .single();

    if (upsertErr) {
      console.error("Profile upsert error", upsertErr);
      return json({ error: upsertErr.message }, 500);
    }

    // Replace estimate items
    await admin
      .from("takeoff_project_estimate_items")
      .delete()
      .eq("takeoff_project_id", body.takeoff_project_id);

    const items = Array.isArray(extraction.estimate_items) ? extraction.estimate_items : [];
    const validItems = items
      .filter((it: any) => it && it.cost_code_label && (it.quantity ?? null) !== null)
      .map((it: any) => ({
        takeoff_project_id: body.takeoff_project_id,
        owner_id: userId,
        cost_code_id: allowedIds.includes(it.cost_code_id) ? it.cost_code_id : null,
        cost_code_label: String(it.cost_code_label).slice(0, 200),
        item_label: it.item_label ?? null,
        size: it.size ?? null,
        quantity: Number(it.quantity) || 0,
        unit: it.unit || "EA",
        spec: it.spec && typeof it.spec === "object" ? it.spec : {},
        source_sheet: it.source_sheet ?? null,
        confidence: it.confidence ?? "low",
        notes: it.notes ?? null,
      }));

    if (validItems.length > 0) {
      const { error: itErr } = await admin
        .from("takeoff_project_estimate_items")
        .insert(validItems);
      if (itErr) console.error("Estimate items insert error", itErr);
    }

    return json({ profile: upserted, items_inserted: validItems.length });
  } catch (e) {
    console.error("extract-project-profile error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
