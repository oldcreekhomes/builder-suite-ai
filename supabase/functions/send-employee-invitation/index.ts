import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

    // Generate password reset link directly
    console.log("🔑 Generating password reset link for user:", userId);
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://buildersuiteai.com/reset-password'
      }
    });

    if (resetError || !resetData.properties?.hashed_token) {
      console.error("❌ Error generating password reset link:", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to generate password reset link" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resetLink = resetData.properties.action_link;
    console.log("🔗 Password reset link generated:", resetLink);

    console.log("📧 Attempting to send invitation email...");

    const emailResponse = await resend.emails.send({
      from: "BuilderSuite AI <noreply@transactional.buildersuiteai.com>",
      to: [email],
      subject: `You've been invited to join ${companyName} on BuilderSuite AI`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to BuilderSuite AI - ${companyName}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Welcome to BuilderSuite AI!</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${companyName}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <!-- Consolidated Invitation Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <tr>
                                    <td style="padding: 25px; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 12px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        Hi ${firstName},
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        You've been invited by ${companyName} to join their team on BuilderSuite AI.
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 20px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        To set up your password and complete your account, please click the button below:
                                                    </p>
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0;">
                                                        <tr>
                                                            <td align="center" style="border-radius: 5px; background-color: #000000;">
                                                                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 5px;" target="_blank">
                                                                    Set Your Password
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                If you have any questions, please contact your administrator.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                <a href="https://www.buildersuiteai.com" style="color: #666666; text-decoration: underline;" target="_blank">www.buildersuiteai.com</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>`,
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

    console.log("✅ Invitation email sent:", emailResponse.data?.id);

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