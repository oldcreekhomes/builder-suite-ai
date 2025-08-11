import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteEmployeeRequest {
  employeeId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId }: DeleteEmployeeRequest = await req.json();

    console.log("🗑️ Processing employee deletion for user:", employeeId);

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete from auth.users first (this requires admin privileges)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(employeeId);
    
    if (authError && !authError.message.includes('User not found')) {
      console.error("❌ Error deleting from auth.users:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to delete employee from authentication system" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ User deleted from auth successfully");

    // Delete from public.users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', employeeId);

    if (dbError) {
      console.error("❌ Error deleting from public.users:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to delete employee from database" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Employee deleted successfully from database");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Employee deleted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in delete-employee:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while deleting the employee" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);