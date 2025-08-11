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

    console.log("Processing employee invitation for:", email);

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
      console.error("Home builder not found:", homeBuilderError);
      return new Response(
        JSON.stringify({ error: "Home builder not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user already exists in public.users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, confirmed")
      .eq("email", email)
      .single();

    let userId: string;
    
    if (existingUser) {
      console.log("User already exists, updating:", existingUser.id);
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
        console.error("Error updating existing user:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update user profile" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
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
        },
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.log("Auth user created:", authUser.user.id);
      userId = authUser.user.id;

      // Create user in public.users table
      const { error: publicUserError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authUser.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          company_name: companyName,
          role: "employee",
          home_builder_id: homeBuilder.id,
          confirmed: false, // Will be confirmed when they complete setup
        });

      if (publicUserError) {
        console.error("Error creating public user:", publicUserError);
        
        // Cleanup: delete the auth user if public user creation failed
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        
        return new Response(
          JSON.stringify({ error: "Failed to create user profile" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Generate invitation token (valid for 24 hours)
    const invitationToken = btoa(JSON.stringify({
      userId: userId,
      email,
      expires: Date.now() + (24 * 60 * 60 * 1000),
    }));

    // Send invitation email
    const invitationUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovableproject.com") || "https://buildersuiteai.com"}/confirm-invitation?token=${invitationToken}`;

    const emailResponse = await resend.emails.send({
      from: "BuilderSuite AI <noreply@buildersuiteai.com>",
      to: [email],
      subject: `You've been invited to join ${companyName} on BuilderSuite AI`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to BuilderSuite AI!</h1>
          <p>Hi ${firstName},</p>
          <p>You've been invited by ${companyName} to join their team on BuilderSuite AI.</p>
          <p>To complete your account setup and create your password, please click the link below:</p>
          <a href="${invitationUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Complete Account Setup</a>
          <p>This invitation link will expire in 24 hours.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br>The BuilderSuite AI Team</p>
        </div>
      `,
    });

    console.log("Invitation email sent:", emailResponse.id);

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