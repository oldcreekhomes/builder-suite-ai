
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  userEmail: string;
  userType: "home_builder" | "employee";
  companyName?: string;
  homeBuilderId?: string;
  homeBuilderEmail?: string;
  confirmationUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userType, companyName, homeBuilderId, homeBuilderEmail, confirmationUrl }: ConfirmationEmailRequest = await req.json();

    console.log("Sending confirmation emails for:", { userEmail, userType, companyName, homeBuilderId, confirmationUrl });

    // Send confirmation email to the new user with confirmation link
    const userEmailHtml = `
      <h1>Welcome to BuildCore!</h1>
      <p>Thank you for creating your account. Please confirm your email address to complete your registration.</p>
      ${confirmationUrl ? `
        <div style="margin: 20px 0;">
          <a href="${confirmationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Confirm Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #2563eb;">${confirmationUrl}</p>
      ` : ''}
      ${userType === "home_builder" 
        ? `<p>You are registered as a Home Builder for: <strong>${companyName}</strong></p>`
        : `<p>You have requested to join a home building company as an employee. The company owner will review your request after you confirm your email.</p>`
      }
      <p>Best regards,<br>The BuildCore Team</p>
    `;

    const userEmailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Welcome to BuildCore - Please Confirm Your Email",
      html: userEmailHtml,
    });

    console.log("User email sent:", userEmailResponse);

    // If it's an employee, send approval email to home builder
    if (userType === "employee" && homeBuilderId && homeBuilderEmail) {
      const homeBuilderEmailResponse = await resend.emails.send({
        from: "BuildCore <onboarding@resend.dev>",
        to: [homeBuilderEmail],
        subject: "New Employee Request - Approval Needed",
        html: `
          <h1>New Employee Request</h1>
          <p>A new user has requested to join your company as an employee:</p>
          <ul>
            <li><strong>Email:</strong> ${userEmail}</li>
            <li><strong>Company:</strong> Your company</li>
          </ul>
          <p><strong>Note:</strong> The employee must first confirm their email address before you can approve their access.</p>
          <p>You will be able to approve this request from your BuildCore dashboard once they have confirmed their email.</p>
          <p>Best regards,<br>The BuildCore Team</p>
        `,
      });

      console.log("Home builder approval email sent:", homeBuilderEmailResponse);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
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
