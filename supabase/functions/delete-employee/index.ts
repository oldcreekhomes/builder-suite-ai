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

    // 1. Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("❌ No authorization token provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authentication token provided" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authGetError } = await supabaseAdmin.auth.getUser(token);

    if (authGetError || !caller) {
      console.error("❌ Auth error:", authGetError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("👤 Deletion requested by user:", caller.id);

    // 2. Verify caller is an owner
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    if (roleError || !callerRoles?.some(r => r.role === 'owner')) {
      console.error("❌ User is not an owner");
      return new Response(
        JSON.stringify({ error: "Forbidden: Only owners can delete employees" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 3. Prevent self-deletion
    if (employeeId === caller.id) {
      console.error("❌ Attempted self-deletion");
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 4. Get target employee's data
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('home_builder_id, id')
      .eq('id', employeeId)
      .single();

    if (targetError || !targetUser) {
      console.error("❌ Target user not found:", targetError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 5. Verify employee belongs to caller's company
    if (targetUser.home_builder_id !== caller.id) {
      console.error("❌ Employee does not belong to this owner");
      return new Response(
        JSON.stringify({ error: "You can only delete employees in your own company" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 6. Prevent deleting other owners
    const { data: targetRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', employeeId);

    if (targetRoles?.some(r => r.role === 'owner')) {
      console.error("❌ Attempted to delete an owner");
      return new Response(
        JSON.stringify({ error: "Cannot delete owner accounts" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ All authorization checks passed, proceeding with deletion");

    // Delete from auth.users first (this requires admin privileges)
    const { error: adminDeleteError } = await supabaseAdmin.auth.admin.deleteUser(employeeId);
    
    if (adminDeleteError && !adminDeleteError.message.includes('User not found')) {
      console.error("❌ Error deleting from auth.users:", adminDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete employee from authentication system: ${adminDeleteError.message}` }),
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
        JSON.stringify({ error: `Failed to delete employee from database: ${dbError.message || dbError.code || 'Unknown error'}` }),
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