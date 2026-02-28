import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded generic template accounts
const TEMPLATE_ACCOUNTS = [
  { code: "1010", name: "XYZ Bank", type: "asset", description: null },
  { code: "1020", name: "Deposits", type: "asset", description: null },
  { code: "1060", name: "Loan to XYZ", type: "asset", description: null },
  { code: "1320", name: "Land - Held For Development", type: "asset", description: null },
  { code: "1430", name: "WIP - Direct Construction Costs", type: "asset", description: null },
  { code: "1670", name: "Deposits", type: "asset", description: null },
  { code: "2010", name: "Accounts Payable", type: "liability", description: "Outstanding amounts owed to vendors and suppliers" },
  { code: "2150", name: "XYZ Credit Card", type: "liability", description: null },
  { code: "2530", name: "Loan - Land", type: "liability", description: null },
  { code: "2540", name: "Loan Refinance", type: "liability", description: null },
  { code: "2905", name: "Equity", type: "equity", description: null },
  { code: "3120", name: "Construction Management Fees", type: "revenue", description: null },
  { code: "3200", name: "Retained Earnings", type: "equity", description: "Undistributed earnings of the business" },
  { code: "9150", name: "Ask Owner", type: "asset", description: null },
];

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

    // Use service role client
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

    // Build new accounts from hardcoded template
    const newAccounts = TEMPLATE_ACCOUNTS.map((acct) => ({
      id: crypto.randomUUID(),
      owner_id: targetOwnerId,
      code: acct.code,
      name: acct.name,
      type: acct.type,
      description: acct.description,
      is_active: true,
      parent_id: null,
    }));

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
