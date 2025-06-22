
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userType, companyName, homeBuilderId, homeBuilderEmail }: ConfirmationEmailRequest = await req.json();

    console.log("Sending confirmation emails for:", { userEmail, userType, companyName, homeBuilderId });

    // Send confirmation email to the new user
    const userEmailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Welcome to BuildCore - Account Created",
      html: `
        <h1>Welcome to BuildCore!</h1>
        <p>Your account has been successfully created.</p>
        ${userType === "home_builder" 
          ? `<p>You are registered as a Home Builder for: <strong>${companyName}</strong></p>`
          : `<p>You have requested to join a home building company as an employee. The company owner will review your request.</p>`
        }
        <p>You can now log in to your account.</p>
        <p>Best regards,<br>The BuildCore Team</p>
      `,
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
          <p>Please review this request and approve or deny access to your company.</p>
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
