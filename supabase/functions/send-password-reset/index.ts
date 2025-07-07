import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Password reset function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing password reset request");
    const { email }: PasswordResetRequest = await req.json();
    console.log("Email received:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!Deno.env.get("RESEND_API_KEY")
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating password reset link for:", email);

    // Instead of using Supabase's recovery link (which auto-signs users in), 
    // let's create a custom reset token and store it temporarily
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Store the reset token temporarily (you could use a database table for this)
    // For now, we'll encode the email and expiry in the token itself
    const resetData = {
      email: email,
      expires: expiresAt.getTime(),
      token: resetToken
    };
    
    const encodedToken = btoa(JSON.stringify(resetData));
    const resetUrl = `${req.headers.get('origin') || 'https://7f4eccd7-6d58-465f-a474-4c0fb79b4bab.lovableproject.com'}/reset-password?token=${encodedToken}`;

    console.log("Generated custom reset URL:", resetUrl);

    // Check if we have Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email with reset link
    try {
      console.log("Attempting to send email via Resend...");
      const emailResponse = await resend.emails.send({
        from: "Bid Packages <noreply@transactional.buildersuiteai.com>",
        to: [email],
        subject: "Reset Your Password - BuilderSuite AI",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">BuilderSuite AI</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Construction Management Platform</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
                
                <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                  We received a request to reset your password for your BuilderSuite AI account. Click the button below to create a new password:
                </p>
                
                 <div style="text-align: center; margin: 30px 0;">
                   <a href="${resetUrl}" 
                      style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                     Reset Your Password
                   </a>
                 </div>
                 
                 <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                   <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.4;">
                     <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, you can safely ignore this email.
                   </p>
                 </div>
                 
                 <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
                   If the button doesn't work, you can copy and paste this link into your browser:<br>
                   <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
                 </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                  Best regards,<br>
                  The BuilderSuite AI Team
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  This email was sent by BuilderSuite AI. If you have questions, contact your system administrator.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Resend API response:", emailResponse);

      if (emailResponse.error) {
        console.error("Resend API error:", emailResponse.error);
        return new Response(
          JSON.stringify({ error: `Email sending failed: ${emailResponse.error.message}` }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.log("Password reset email sent successfully!");
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: `Email sending failed: ${emailError.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully" 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in password reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);