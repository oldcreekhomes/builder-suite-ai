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
  console.log("🔑 CONFIRM INVITATION - Setting password for employee");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, password } = await req.json() as ConfirmInvitationRequest;
    
    if (!userId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = "https://nlmnwlvmmkngrgatnzkj.supabase.co";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      console.error("🔑 SERVICE_ROLE_KEY missing");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("🔑 Updating password for user:", userId);
    
    // Update the user's password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (authError) {
      console.error("🔑 Password update failed:", authError);
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

    console.log("🔑 Password updated, marking user as confirmed");

    // Mark user as confirmed in public.users table
    const { error: confirmError } = await supabaseAdmin
      .from("users")
      .update({ confirmed: true })
      .eq("id", userId);

    if (confirmError) {
      console.error("🔑 User confirmation failed:", confirmError);
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

    console.log("🔑 Employee setup complete");

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
      JSON.stringify({ 
        success: false, 
        error: `Server error: ${error.message}` 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);