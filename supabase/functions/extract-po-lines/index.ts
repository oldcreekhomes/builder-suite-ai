import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CostCodeRef {
  id: string;
  code: string;
  name: string;
}

interface ExtractedLine {
  cost_code_id: string | null;
  cost_code_display: string;
  description: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  extra: boolean;
}

const SYSTEM_PROMPT = `You extract billable line items from a vendor proposal/quote PDF for a residential construction project.

Rules:
- Return ONE line item per discrete priced task in the proposal.
- Use the EXACT description language from the proposal (you may shorten slightly to ~80 chars but keep numbering and key terms).
- For lump-sum items: quantity = 1, unit_cost = the lump sum, amount = unit_cost.
- For "Hourly", "As Required", "If Required" or unpriced items: quantity = 0, unit_cost = 0, amount = 0, extra = true.
- For sub-rate items grouped under one heading (e.g. multiple stake-out rates), produce ONE line per sub-rate.
- Always pick a cost_code_hint from the supplied list of cost codes (use the closest match by name/scope). If nothing matches, leave cost_code_hint empty.
- Never invent prices. Never combine multiple priced items into one line.`;

function matchCostCode(hint: string, codes: CostCodeRef[]): CostCodeRef | null {
  if (!hint) return null;
  const h = hint.toLowerCase().trim();
  // exact name
  let m = codes.find((c) => c.name.toLowerCase() === h);
  if (m) return m;
  // contains
  m = codes.find((c) => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()));
  if (m) return m;
  // word overlap
  const hWords = new Set(h.split(/\s+/).filter((w) => w.length > 3));
  let best: { c: CostCodeRef; score: number } | null = null;
  for (const c of codes) {
    const cWords = c.name.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of cWords) if (hWords.has(w)) score++;
    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const proposalPaths: string[] = Array.isArray(body.proposalPaths) ? body.proposalPaths : [];
    const costCodes: CostCodeRef[] = Array.isArray(body.costCodes) ? body.costCodes : [];
    const fallbackCostCodeId: string | null = body.fallbackCostCodeId ?? null;

    if (proposalPaths.length === 0) {
      return new Response(JSON.stringify({ lines: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download first PDF (most proposals are a single file).
    const firstPath = proposalPaths[0];
    const { data: fileBlob, error: dlError } = await admin.storage
      .from("project-files")
      .download(`proposals/${firstPath}`);

    if (dlError || !fileBlob) {
      console.error("Download error:", dlError);
      return new Response(JSON.stringify({ error: "Could not download proposal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);

    const costCodeList = costCodes
      .map((c) => `- ${c.name}`)
      .join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Available cost codes (pick closest by name):\n${costCodeList}\n\nExtract every priced task and hourly/as-required line from the attached proposal PDF.`,
              },
              {
                type: "file",
                file: {
                  filename: firstPath,
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_line_items",
              description: "Return the extracted PO line items.",
              parameters: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cost_code_hint: { type: "string", description: "Closest cost code name from the list, or empty." },
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit_cost: { type: "number" },
                        amount: { type: "number" },
                        extra: { type: "boolean", description: "True for hourly/as-required/unpriced items." },
                      },
                      required: ["cost_code_hint", "description", "quantity", "unit_cost", "amount", "extra"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_line_items" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : { lines: [] };
    const rawLines: any[] = Array.isArray(args.lines) ? args.lines : [];

    const fallback = fallbackCostCodeId
      ? costCodes.find((c) => c.id === fallbackCostCodeId) ?? null
      : null;

    const lines: ExtractedLine[] = rawLines.map((l) => {
      const matched = matchCostCode(String(l.cost_code_hint || ""), costCodes) ?? fallback;
      const qty = Number(l.quantity) || 0;
      const unit = Number(l.unit_cost) || 0;
      const amt = Number(l.amount) || Math.round(qty * unit * 100) / 100;
      return {
        cost_code_id: matched?.id ?? null,
        cost_code_display: matched ? `${matched.code} - ${matched.name}` : "",
        description: String(l.description || "").slice(0, 500),
        quantity: qty,
        unit_cost: unit,
        amount: Math.round(amt * 100) / 100,
        extra: Boolean(l.extra),
      };
    });

    return new Response(JSON.stringify({ lines }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-po-lines error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
