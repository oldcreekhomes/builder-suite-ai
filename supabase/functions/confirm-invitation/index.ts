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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, password }: ConfirmInvitationRequest = await req.json();

    console.log("🔑 Processing invitation confirmation for user:", userId);
    console.log("🔑 Password provided:", password ? "YES" : "NO");
    console.log("🔑 Environment check - SUPABASE_URL:", Deno.env.get("SUPABASE_URL") ? "SET" : "MISSING");
    console.log("🔑 Environment check - SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET" : "MISSING");

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      "https://nlmnwlvmmkngrgatnzkj.supabase.co",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update the user's password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (authError) {
      console.error("❌ Error updating password:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to set up your account. Please try again or contact support." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Password updated successfully");

    // Mark user as confirmed in public.users table
    const { error: confirmError } = await supabaseAdmin
      .from("users")
      .update({ confirmed: true })
      .eq("id", userId);

    if (confirmError) {
      console.error("❌ Error confirming user:", confirmError);
      return new Response(
        JSON.stringify({ error: "Account setup incomplete. Please contact your administrator." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ User confirmed successfully");

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
    console.error("❌ Error in confirm-invitation:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);