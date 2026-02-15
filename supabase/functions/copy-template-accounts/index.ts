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

    // Get the user's owner_id
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

    // Check if user already has accounts
    const { count: existingCount } = await adminClient
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", targetOwnerId);

    if (existingCount && existingCount > 0) {
      return new Response(
        JSON.stringify({ error: "Accounts already exist for this account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all template accounts from Old Creek Homes
    const { data: templateAccounts, error: templateError } = await adminClient
      .from("accounts")
      .select("*")
      .eq("owner_id", TEMPLATE_OWNER_ID)
      .eq("is_active", true)
      .order("code");

    if (templateError) {
      console.error("Error fetching template accounts:", templateError);
      return new Response(JSON.stringify({ error: "Failed to fetch template accounts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!templateAccounts || templateAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "No template accounts found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build old ID -> new ID mapping for parent_id remapping
    const idMap = new Map<string, string>();
    const newAccounts = templateAccounts.map((acct) => {
      const newId = crypto.randomUUID();
      idMap.set(acct.id, newId);
      return {
        id: newId,
        owner_id: targetOwnerId,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        description: acct.description,
        is_active: acct.is_active,
        parent_id: acct.parent_id, // will be remapped below
      };
    });

    // Remap parent_id references
    for (const acct of newAccounts) {
      if (acct.parent_id && idMap.has(acct.parent_id)) {
        acct.parent_id = idMap.get(acct.parent_id)!;
      } else {
        acct.parent_id = null;
      }
    }

    // Insert accounts in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < newAccounts.length; i += BATCH_SIZE) {
      const batch = newAccounts.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await adminClient.from("accounts").insert(batch);
      if (insertError) {
        console.error("Error inserting accounts batch:", insertError);
        return new Response(JSON.stringify({ error: "Failed to insert accounts" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accountsImported: newAccounts.length,
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
