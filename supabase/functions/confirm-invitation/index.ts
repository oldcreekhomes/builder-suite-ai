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
  console.log("🔑 Confirm invitation function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("🔑 Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.text();
    console.log("🔑 Raw request body:", requestBody);
    
    let parsedBody: ConfirmInvitationRequest;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("🔑 JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request format" }),
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
    
    console.log("🔑 Environment check - SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.log("🔑 Environment check - SERVICE_ROLE_KEY:", serviceRoleKey ? "SET" : "MISSING");

    if (!serviceRoleKey) {
      console.error("🔑 SERVICE_ROLE_KEY is missing");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log("🔑 Updating user password in Supabase Auth...");
    // Update the user's password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (authError) {
      console.error("🔑 Error updating password:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to set up your account. Please try again or contact support." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔑 Password updated successfully, now updating users table...");

    // Mark user as confirmed in public.users table
    const { error: confirmError } = await supabaseAdmin
      .from("users")
      .update({ confirmed: true })
      .eq("id", userId);

    if (confirmError) {
      console.error("🔑 Error confirming user:", confirmError);
      return new Response(
        JSON.stringify({ success: false, error: "Account setup incomplete. Please contact your administrator." }),
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
    console.error("🔑 Error in confirm-invitation:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);