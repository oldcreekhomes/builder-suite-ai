import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  homeBuilderEmail: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      role,
      homeBuilderEmail,
      companyName,
    }: InvitationRequest = await req.json();

    console.log("🚀 Processing employee invitation for:", email);
    console.log("📋 Request data:", { firstName, lastName, email, phoneNumber, role, homeBuilderEmail, companyName });

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the home builder's ID
    const { data: homeBuilder, error: homeBuilderError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", homeBuilderEmail)
      .eq("role", "owner")
      .single();

    if (homeBuilderError || !homeBuilder) {
      console.error("❌ Home builder not found:", homeBuilderError);
      console.error("❌ Home builder email searched:", homeBuilderEmail);
      return new Response(
        JSON.stringify({ error: "Home builder not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Home builder found:", homeBuilder.id);

    // Check if user already exists in public.users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, confirmed")
      .eq("email", email)
      .maybeSingle();

    let userId: string;
    
    if (existingUser) {
      console.log("👤 User already exists, updating:", existingUser.id);
      userId = existingUser.id;
      
      // Update existing user
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          company_name: companyName,
          role: "employee",
          home_builder_id: homeBuilder.id,
          confirmed: false,
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("❌ Error updating existing user:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user profile" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      console.log("✅ Existing user updated successfully");
    } else {
      // Check if auth user exists first
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers.users?.find(user => user.email === email);
      
      if (existingAuthUser) {
        console.log("👤 Auth user exists, creating public user:", existingAuthUser.id);
        userId = existingAuthUser.id;
        
        // Create user in public.users table
        const { error: publicUserError } = await supabaseAdmin
          .from("users")
          .upsert({
            id: existingAuthUser.id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            company_name: companyName,
            role: "employee",
            home_builder_id: homeBuilder.id,
            confirmed: false,
          });

        if (publicUserError) {
          console.error("❌ Error creating public user:", publicUserError);
          return new Response(
            JSON.stringify({ error: "Failed to create user profile" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        
        console.log("✅ Public user created for existing auth user");
      } else {
        // Create user in Supabase Auth with a temporary password
        const tempPassword = crypto.randomUUID();
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm the email
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            user_type: "employee",
            home_builder_id: homeBuilder.id,
            role: "employee", // Add role to metadata for trigger
            company_name: companyName, // Add company name for trigger
          },
        });

        if (authError) {
          console.error("❌ Error creating auth user:", authError);
          return new Response(
            JSON.stringify({ error: "Failed to create user account" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        console.log("✅ Auth user created (trigger will create public user):", authUser.user.id);
        userId = authUser.user.id;

        // Note: The handle_new_user() trigger automatically creates the public.users record
        // No manual insertion needed - this was causing the duplicate key error
      }
    }

    // Generate password reset link using Supabase's built-in flow
    console.log("🔑 Generating password reset for user:", userId);
    
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://buildersuiteai.com/auth?mode=recovery'
      }
    });

    if (resetError) {
      console.error("❌ Error generating password reset:", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to generate password reset link" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("📧 Attempting to send invitation email...");

    const emailResponse = await resend.emails.send({
      from: "BuilderSuite AI <noreply@transactional.buildersuiteai.com>",
      to: [email],
      subject: `You've been invited to join ${companyName} on BuilderSuite AI`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to BuilderSuite AI!</h1>
          <p>Hi ${firstName},</p>
          <p>You've been invited by ${companyName} to join their team on BuilderSuite AI.</p>
          <p>A password reset email has been sent to you from Supabase. Please check your email and follow the instructions to set your password.</p>
          <p>After setting your password, you can log in at:</p>
          <a href="https://buildersuiteai.com/auth" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login to BuilderSuite AI</a>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br>The BuilderSuite AI Team</p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("❌ Email failed to send:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send invitation email" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Invitation email sent:", emailResponse.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Employee invitation sent successfully",
        userId: userId 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-employee-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);