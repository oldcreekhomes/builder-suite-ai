import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmInvitationRequest {
  userId: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🔑 CONFIRM INVITATION FUNCTION STARTED - NEW VERSION");
  console.log("🔑 Request method:", req.method);
  console.log("🔑 Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("🔑 Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔑 About to read request body");
    const requestBody = await req.text();
    console.log("🔑 Raw request body length:", requestBody.length);
    console.log("🔑 Raw request body content:", requestBody.substring(0, 200));
    
    if (!requestBody) {
      console.error("🔑 Empty request body received");
      return new Response(
        JSON.stringify({ success: false, error: "Empty request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    let parsedBody: ConfirmInvitationRequest;
    try {
      parsedBody = JSON.parse(requestBody);
      console.log("🔑 Successfully parsed JSON:", { userId: parsedBody.userId, hasPassword: !!parsedBody.password });
    } catch (parseError) {
      console.error("🔑 JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { userId, password } = parsedBody;

    console.log("🔑 Processing invitation confirmation for user:", userId);
    console.log("🔑 Password provided:", password ? "YES" : "NO");
    
    // Validate input
    if (!userId || !password) {
      console.error("🔑 Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "User ID and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://nlmnwlvmmkngrgatnzkj.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("🔑 Environment check - SUPABASE_URL:", supabaseUrl);
    console.log("🔑 Environment check - SERVICE_ROLE_KEY exists:", !!serviceRoleKey);
    console.log("🔑 Environment check - SERVICE_ROLE_KEY length:", serviceRoleKey?.length || 0);

    if (!serviceRoleKey) {
      console.error("🔑 CRITICAL: SERVICE_ROLE_KEY is missing from environment");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error - missing service role key" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    console.log("🔑 Creating Supabase admin client...");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("🔑 Updating user password in Supabase Auth...");
    console.log("🔑 Target user ID:", userId);
    
    // Update the user's password in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    console.log("🔑 Auth update result - data:", authData);
    console.log("🔑 Auth update result - error:", authError);

    if (authError) {
      console.error("🔑 Error updating password:", authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update password: ${authError.message}` 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔑 Password updated successfully, now updating users table...");

    // Mark user as confirmed in public.users table
    const { data: updateData, error: confirmError } = await supabaseAdmin
      .from("users")
      .update({ confirmed: true })
      .eq("id", userId)
      .select();

    console.log("🔑 Users table update result - data:", updateData);
    console.log("🔑 Users table update result - error:", confirmError);

    if (confirmError) {
      console.error("🔑 Error confirming user in users table:", confirmError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database update failed: ${confirmError.message}` 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔑 User confirmed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account setup complete! You can now log in." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("🔑 CRITICAL ERROR in confirm-invitation function:", error);
    console.error("🔑 Error stack:", error.stack);
    console.error("🔑 Error name:", error.name);
    console.error("🔑 Error message:", error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}`,
        details: error.name 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);