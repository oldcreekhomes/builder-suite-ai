import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_OWNER_ID = "2653aba8-d154-4301-99bf-77d559492e19";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role client to read template data and write to user's account
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get the user's owner_id (could be the user themselves if owner, or their home_builder_id if employee)
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id, role, home_builder_id")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetOwnerId = userData.role === "owner" ? userData.id : userData.home_builder_id;
    if (!targetOwnerId) {
      return new Response(JSON.stringify({ error: "No owner account found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAFETY: never copy a template account back into itself
    if (targetOwnerId === TEMPLATE_OWNER_ID) {
      return new Response(
        JSON.stringify({ error: "Cannot copy template into the template owner account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has cost codes
    const { count: existingCount } = await adminClient
      .from("cost_codes")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", targetOwnerId);

    if (existingCount && existingCount > 0) {
      return new Response(
        JSON.stringify({ error: "Cost codes already exist for this account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all template cost codes from Old Creek Homes
    const { data: templateCodes, error: templateError } = await adminClient
      .from("cost_codes")
      .select("*")
      .eq("owner_id", TEMPLATE_OWNER_ID)
      .order("code");

    if (templateError) {
      console.error("Error fetching template cost codes:", templateError);
      return new Response(JSON.stringify({ error: "Failed to fetch template cost codes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!templateCodes || templateCodes.length === 0) {
      return new Response(JSON.stringify({ error: "No template cost codes found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build old ID -> new ID mapping
    const idMap = new Map<string, string>();
    const newCostCodes = templateCodes.map((cc) => {
      const newId = crypto.randomUUID();
      idMap.set(cc.id, newId);
      return {
        id: newId,
        owner_id: targetOwnerId,
        code: cc.code,
        name: cc.name,
        category: cc.category,
        parent_group: cc.parent_group,
        quantity: cc.quantity,
        price: cc.price,
        unit_of_measure: cc.unit_of_measure,
        has_specifications: cc.has_specifications,
        has_bidding: cc.has_bidding,
        has_subcategories: cc.has_subcategories,
        estimate: cc.estimate,
      };
    });

    // Insert cost codes in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < newCostCodes.length; i += BATCH_SIZE) {
      const batch = newCostCodes.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await adminClient.from("cost_codes").insert(batch);
      if (insertError) {
        console.error("Error inserting cost codes batch:", insertError);
        return new Response(JSON.stringify({ error: "Failed to insert cost codes" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch template specifications
    const templateCodeIds = templateCodes.map((cc) => cc.id);
    let specsInserted = 0;

    // Fetch specs in batches to avoid URL length limits
    const SPEC_BATCH = 50;
    for (let i = 0; i < templateCodeIds.length; i += SPEC_BATCH) {
      const batchIds = templateCodeIds.slice(i, i + SPEC_BATCH);
      const { data: templateSpecs, error: specsError } = await adminClient
        .from("cost_code_specifications")
        .select("*")
        .in("cost_code_id", batchIds);

      if (specsError) {
        console.error("Error fetching specs batch:", specsError);
        continue;
      }

      if (templateSpecs && templateSpecs.length > 0) {
        const newSpecs = templateSpecs
          .filter((spec) => idMap.has(spec.cost_code_id))
          .map((spec) => ({
            id: crypto.randomUUID(),
            cost_code_id: idMap.get(spec.cost_code_id)!,
            description: spec.description,
          }));

        if (newSpecs.length > 0) {
          const { error: specInsertError } = await adminClient
            .from("cost_code_specifications")
            .insert(newSpecs);
          if (specInsertError) {
            console.error("Error inserting specs:", specInsertError);
          } else {
            specsInserted += newSpecs.length;
          }
        }
      }
    }

    // Copy price history records
    let priceHistoryInserted = 0;
    for (let i = 0; i < templateCodeIds.length; i += SPEC_BATCH) {
      const batchIds = templateCodeIds.slice(i, i + SPEC_BATCH);
      const { data: templateHistory, error: historyError } = await adminClient
        .from("cost_code_price_history")
        .select("*")
        .in("cost_code_id", batchIds);

      if (historyError) {
        console.error("Error fetching price history batch:", historyError);
        continue;
      }

      if (templateHistory && templateHistory.length > 0) {
        const newHistory = templateHistory
          .filter((h) => idMap.has(h.cost_code_id))
          .map((h) => ({
            id: crypto.randomUUID(),
            cost_code_id: idMap.get(h.cost_code_id)!,
            owner_id: targetOwnerId,
            price: h.price,
            changed_at: h.changed_at,
            notes: h.notes,
          }));

        for (let j = 0; j < newHistory.length; j += BATCH_SIZE) {
          const batch = newHistory.slice(j, j + BATCH_SIZE);
          const { error: histInsertError } = await adminClient
            .from("cost_code_price_history")
            .insert(batch);
          if (histInsertError) {
            console.error("Error inserting price history:", histInsertError);
          } else {
            priceHistoryInserted += batch.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        costCodesImported: newCostCodes.length,
        specificationsImported: specsInserted,
        priceHistoryImported: priceHistoryInserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
